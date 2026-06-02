import { randomBytes } from "node:crypto";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { writeAuditEvent } from "@/lib/domains/audit";
import {
	type ActiveOrgContext,
	assertCanCreateAdditionalWorkspace,
	assertOrgPermission,
	countOwnedOrganizations,
	listOrgTemplatesCached,
	listUserOrgsCached,
	resolveIsPersonalForNewOrganization,
	slugifyOrgName,
} from "@/lib/domains/orgs";
import {
	attachPendingOrgBillingOnCreateWithTx,
	grantAdminOrgTeamsProIfEligibleWithTx,
} from "@/lib/domains/platform-access";
import {
	invalidateOnMembershipChange,
	invalidateOrgEntitlements,
	invalidateUserOrgs,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { zOrgMemberRole } from "./schemas";

const {
	organizations,
	organizationMembers,
	organizationMemberKeys,
	organizationSubscriptions,
	users,
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
	const ownedBefore = await countOwnedOrganizations(creator);
	await assertCanCreateAdditionalWorkspace(creator);
	const isPersonal = resolveIsPersonalForNewOrganization(ownedBefore);
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
					isPersonal,
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

			await attachPendingOrgBillingOnCreateWithTx(tx, {
				creatorWallet: creator,
				organizationId: org.id,
			});

			const [creatorRow] = await tx
				.select({ email: users.email })
				.from(users)
				.where(eq(users.walletAddress, creator))
				.limit(1);

			await grantAdminOrgTeamsProIfEligibleWithTx(tx, {
				organizationId: org.id,
				creatorEmail: creatorRow?.email ?? null,
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

	await invalidateUserOrgs(creator);
	await invalidateOrgEntitlements(result.data.id);

	return { organization: result.data };
}

export async function orgsListMine(wallet: Address) {
	return listUserOrgsCached(wallet);
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
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
		})
		.from(organizationMembers)
		.leftJoin(users, eq(organizationMembers.walletAddress, users.walletAddress))
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

	const templates = await listOrgTemplatesCached(orgId);

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

	const members = await db
		.select({ walletAddress: organizationMembers.walletAddress })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, activeOrg.organizationId),
				eq(organizationMembers.status, "active"),
			),
		);
	await Promise.all(members.map((m) => invalidateUserOrgs(m.walletAddress)));

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

	if (activeOrg.role !== "owner") {
		if (parsed.data.role === "owner") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only organization owners can promote members to owner",
			});
		}
		if (current.role === "owner") {
			throw new ORPCError("FORBIDDEN", {
				message: "Only organization owners can modify owner roles",
			});
		}
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
	await invalidateOnMembershipChange(activeOrg.organizationId, targetWallet);
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
	if (target.role === "owner" && activeOrg.role !== "owner") {
		throw new ORPCError("FORBIDDEN", {
			message: "Only organization owners can remove owners",
		});
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
	await writeAuditEvent({
		actorWallet,
		organizationId: activeOrg.organizationId,
		action: "member.removed",
		resourceType: "organization_member",
		resourceId: targetWallet,
		metadata: {
			role: target.role,
		},
	});
	await invalidateOnMembershipChange(activeOrg.organizationId, targetWallet);
	return { member };
}
