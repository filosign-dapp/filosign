import { randomBytes } from "node:crypto";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import { slugifyOrgName } from "@/lib/domains/orgs/slug";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { zOrgMemberRole } from "./schemas";

const {
	organizations,
	organizationMembers,
	organizationMemberKeys,
	organizationTemplates,
	organizationSubscriptions,
} = db.schema;

const zCreateOrgBody = z.object({
	name: z.string().min(1).max(120),
	slug: z.string().min(1).max(64).optional(),
	encryptionPublicKey: z.string().min(1),
	wrappedOmkForCreator: zHexString(),
	creatorWrapKemCiphertext: zHexString(),
});

export async function orgsCreate(wallet: Address, body: unknown) {
	const parsed = zCreateOrgBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const creator = getAddress(wallet);
	const slugBase = parsed.data.slug ?? slugifyOrgName(parsed.data.name);
	const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;

	const result = await tryCatch(
		db.transaction(async (tx) => {
			const [org] = await tx
				.insert(organizations)
				.values({
					name: parsed.data.name.trim(),
					slug,
					encryptionPublicKey: parsed.data.encryptionPublicKey,
					createdByWallet: creator,
				})
				.returning();

			if (!org) throw new Error("Failed to create organization");

			await tx.insert(organizationMembers).values({
				organizationId: org.id,
				walletAddress: creator,
				role: "owner",
				status: "active",
			});

			await tx.insert(organizationMemberKeys).values({
				organizationId: org.id,
				walletAddress: creator,
				wrappedOmk: parsed.data.wrappedOmkForCreator,
				wrapKemCiphertext: parsed.data.creatorWrapKemCiphertext,
				wrappedByWallet: creator,
			});

			await tx.insert(organizationSubscriptions).values({
				organizationId: org.id,
				planId: "free",
				seatCount: 1,
			});

			return org;
		}),
	);

	if (result.error) {
		const msg =
			result.error instanceof Error ? result.error.message : "Create failed";
		if (msg.includes("unique") || msg.includes("duplicate")) {
			throw new ORPCError("CONFLICT", { message: "Organization slug taken" });
		}
		throw new ORPCError("INTERNAL_SERVER_ERROR", { message: msg });
	}

	return { organization: result.data };
}

export async function orgsListMine(wallet: Address) {
	const walletNorm = getAddress(wallet);
	const rows = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			encryptionPublicKey: organizations.encryptionPublicKey,
			role: organizationMembers.role,
			status: organizationMembers.status,
		})
		.from(organizationMembers)
		.innerJoin(
			organizations,
			eq(organizations.id, organizationMembers.organizationId),
		)
		.where(
			and(
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.status, "active"),
			),
		)
		.orderBy(desc(organizations.createdAt));

	return { organizations: rows };
}

export async function orgsGet(
	_wallet: Address,
	activeOrg: ActiveOrgContext,
	orgId: string,
) {
	if (activeOrg.organizationId !== orgId) {
		throw new ORPCError("FORBIDDEN", { message: "Organization mismatch" });
	}

	const [org] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	if (!org)
		throw new ORPCError("NOT_FOUND", { message: "Organization not found" });

	const members = await db
		.select({
			walletAddress: organizationMembers.walletAddress,
			role: organizationMembers.role,
			status: organizationMembers.status,
			hasKeyWrap: sql<boolean>`${organizationMemberKeys.walletAddress} IS NOT NULL`,
		})
		.from(organizationMembers)
		.leftJoin(
			organizationMemberKeys,
			and(
				eq(
					organizationMemberKeys.organizationId,
					organizationMembers.organizationId,
				),
				eq(
					organizationMemberKeys.walletAddress,
					organizationMembers.walletAddress,
				),
			),
		)
		.where(eq(organizationMembers.organizationId, orgId));

	const templates = await db
		.select({
			id: organizationTemplates.id,
			name: organizationTemplates.name,
			createdAt: organizationTemplates.createdAt,
			createdByWallet: organizationTemplates.createdByWallet,
		})
		.from(organizationTemplates)
		.where(eq(organizationTemplates.organizationId, orgId))
		.orderBy(desc(organizationTemplates.createdAt));

	return { organization: org, members, templates };
}

const zOrgUpdateBody = z
	.object({
		name: z.string().min(1).max(120).optional(),
		slug: z.string().min(1).max(64).optional(),
	})
	.refine((v) => Boolean(v.name ?? v.slug), {
		message: "Provide at least one field to update",
	});

export async function orgsUpdate(
	_wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "org:manage");
	const parsed = zOrgUpdateBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const patch: { name?: string; slug?: string; updatedAt: Date } = {
		updatedAt: new Date(),
	};
	if (parsed.data.name) patch.name = parsed.data.name.trim();
	if (parsed.data.slug) patch.slug = slugifyOrgName(parsed.data.slug);

	const [organization] = await db
		.update(organizations)
		.set(patch)
		.where(eq(organizations.id, activeOrg.organizationId))
		.returning();

	if (!organization) {
		throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
	}
	return { organization };
}

const zMembersSetRoleBody = z.object({
	walletAddress: zEvmAddress(),
	role: zOrgMemberRole,
});

export async function orgsMembersSetRole(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "org:manage");
	const parsed = zMembersSetRoleBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const targetWallet = getAddress(parsed.data.walletAddress);
	const actorWallet = getAddress(wallet);

	const [current] = await db
		.select({
			role: organizationMembers.role,
			status: organizationMembers.status,
		})
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, activeOrg.organizationId),
				eq(organizationMembers.walletAddress, targetWallet),
			),
		)
		.limit(1);
	if (!current || current.status !== "active") {
		throw new ORPCError("NOT_FOUND", { message: "Member not found" });
	}

	if (targetWallet === actorWallet && parsed.data.role !== "owner") {
		throw new ORPCError("FORBIDDEN", {
			message: "You cannot demote yourself from owner",
		});
	}

	if (current.role === "owner" && parsed.data.role !== "owner") {
		const [ownerCount] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, activeOrg.organizationId),
					eq(organizationMembers.status, "active"),
					eq(organizationMembers.role, "owner"),
				),
			);
		if ((ownerCount?.count ?? 0) <= 1) {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization must have at least one owner",
			});
		}
	}

	const [member] = await db
		.update(organizationMembers)
		.set({ role: parsed.data.role, updatedAt: new Date() })
		.where(
			and(
				eq(organizationMembers.organizationId, activeOrg.organizationId),
				eq(organizationMembers.walletAddress, targetWallet),
			),
		)
		.returning();
	if (!member)
		throw new ORPCError("NOT_FOUND", { message: "Member not found" });
	return { member };
}

const zMembersRemoveBody = z.object({
	walletAddress: zEvmAddress(),
});

export async function orgsMembersRemove(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "members:remove");
	const parsed = zMembersRemoveBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const targetWallet = getAddress(parsed.data.walletAddress);
	const actorWallet = getAddress(wallet);
	if (targetWallet === actorWallet) {
		throw new ORPCError("FORBIDDEN", {
			message: "Use ownership transfer flow",
		});
	}

	const [target] = await db
		.select({
			role: organizationMembers.role,
			status: organizationMembers.status,
		})
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, activeOrg.organizationId),
				eq(organizationMembers.walletAddress, targetWallet),
			),
		)
		.limit(1);
	if (!target || target.status !== "active") {
		throw new ORPCError("NOT_FOUND", { message: "Member not found" });
	}
	if (target.role === "owner") {
		const [ownerCount] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, activeOrg.organizationId),
					eq(organizationMembers.status, "active"),
					eq(organizationMembers.role, "owner"),
				),
			);
		if ((ownerCount?.count ?? 0) <= 1) {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization must have at least one owner",
			});
		}
	}

	const [member] = await db
		.update(organizationMembers)
		.set({ status: "removed", updatedAt: new Date() })
		.where(
			and(
				eq(organizationMembers.organizationId, activeOrg.organizationId),
				eq(organizationMembers.walletAddress, targetWallet),
			),
		)
		.returning();
	if (!member)
		throw new ORPCError("NOT_FOUND", { message: "Member not found" });
	return { member };
}
