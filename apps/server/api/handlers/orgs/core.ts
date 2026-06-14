import { randomBytes } from "node:crypto";
import { throwAppError } from "@filosign/errors/server";
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
	syncOrgControllersOnChain,
} from "@/lib/domains/orgs";
import { validateLinkOrgWalletSignature } from "@/lib/domains/orgs/utils/link-wallet";
import {
	attachPartnerTrialOnOrgCreateWithTx,
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
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { zOrgMemberRole } from "./schemas";

const {
	organizations,
	organizationMembers,
	organizationMemberKeys,
	organizationSubscriptions,
	users,
} = db.schema;

export const zOrgsCreateBody = z.object({
	name: z.string().min(1).max(120),
	slug: z.string().min(1).max(64).optional(),
	encryptionPublicKey: zHexString(),
	wrappedOmkForCreator: zHexString(),
	creatorWrapKemCiphertext: zHexString(),
});

export async function orgsCreate(wallet: Address, body: unknown) {
	const parsed = zOrgsCreateBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}
	const creator = getAddress(wallet);
	const ownedBefore = await countOwnedOrganizations(creator);
	await assertCanCreateAdditionalWorkspace(creator);
	const isPersonal = resolveIsPersonalForNewOrganization(ownedBefore);
	const slugBase = parsed.data.slug ?? slugifyOrgName(parsed.data.name);
	const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;
	const linkedAt = new Date();

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
					orgWalletAddress: creator,
					orgWalletLinkedAt: linkedAt,
				})
				.returning();

			if (!org) throwAppError("WORKSPACE.CREATE_FAILED");

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

			await attachPartnerTrialOnOrgCreateWithTx(tx, {
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
			throwAppError("WORKSPACE.SLUG_TAKEN");
		}
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: msg,
		});
	}

	await invalidateUserOrgs(creator);
	await invalidateOrgEntitlements(result.data.id);

	if (!isPersonal) {
		const syncRes = await tryCatch(syncOrgControllersOnChain(result.data.id));
		if (syncRes.error) {
			throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
				message: "Failed to sync organization controllers on-chain",
			});
		}
	}

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
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}

	const [org] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	if (!org) throwAppError("WORKSPACE.ORGANIZATION_NOT_FOUND");

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

export const zOrgsUpdateBody = z
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
	const parsed = zOrgsUpdateBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
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
		throwAppError("WORKSPACE.ORGANIZATION_NOT_FOUND");
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

export const zOrgsMembersSetRoleBody = z.object({
	walletAddress: zEvmAddress(),
	role: zOrgMemberRole,
});

export async function orgsMembersSetRole(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "org:manage");
	const parsed = zOrgsMembersSetRoleBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
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
		throwAppError("WORKSPACE.MEMBER_NOT_FOUND");
	}

	if (activeOrg.role !== "owner") {
		if (parsed.data.role === "owner") {
			throwAppError("WORKSPACE.OWNER_REQUIRED_FOR_PROMOTION");
		}
		if (current.role === "owner") {
			throwAppError("WORKSPACE.OWNER_REQUIRED_FOR_MODIFICATION");
		}
	}

	if (targetWallet === actorWallet && parsed.data.role !== "owner") {
		throwAppError("WORKSPACE.SELF_DEMOTION_FORBIDDEN");
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
			throwAppError("WORKSPACE.OWNER_REQUIRED");
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
	if (!member) throwAppError("WORKSPACE.MEMBER_NOT_FOUND");
	await invalidateOnMembershipChange(activeOrg.organizationId, targetWallet);
	const syncRes = await tryCatch(
		syncOrgControllersOnChain(activeOrg.organizationId),
	);
	if (syncRes.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to sync organization controllers on-chain",
		});
	}
	return { member };
}

export const zOrgsMembersRemoveBody = z.object({
	walletAddress: zEvmAddress(),
});

export async function orgsMembersRemove(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "members:remove");
	const parsed = zOrgsMembersRemoveBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}
	const targetWallet = getAddress(parsed.data.walletAddress);
	const actorWallet = getAddress(wallet);
	if (targetWallet === actorWallet) {
		throwAppError("WORKSPACE.USE_OWNERSHIP_TRANSFER");
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
		throwAppError("WORKSPACE.MEMBER_NOT_FOUND");
	}
	if (target.role === "owner" && activeOrg.role !== "owner") {
		throwAppError("WORKSPACE.OWNER_REQUIRED_FOR_REMOVAL");
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
			throwAppError("WORKSPACE.OWNER_REQUIRED");
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
	if (!member) throwAppError("WORKSPACE.MEMBER_NOT_FOUND");
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
	const syncRes = await tryCatch(
		syncOrgControllersOnChain(activeOrg.organizationId),
	);
	if (syncRes.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to sync organization controllers on-chain",
		});
	}
	return { member };
}

export const zOrgsLinkWalletBody = z.object({
	organizationId: z.uuid(),
	orgWalletAddress: zEvmAddress(),
	timestamp: z.number().int().positive(),
	signature: zHexString(),
});

export async function orgsLinkOrgWallet(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "org:manage");
	const parsed = zOrgsLinkWalletBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}
	if (parsed.data.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}

	const orgWallet = getAddress(parsed.data.orgWalletAddress);
	const signer = getAddress(wallet);
	if (orgWallet !== signer) {
		throwAppError("WORKSPACE.WALLET_CONTROLLER_MISMATCH");
	}

	const valid = await validateLinkOrgWalletSignature({
		walletAddress: orgWallet,
		organizationId: parsed.data.organizationId,
		timestamp: parsed.data.timestamp,
		signature: parsed.data.signature,
	});
	if (!valid) {
		throwAppError("WORKSPACE.LINK_WALLET_SIGNATURE_INVALID");
	}

	const linkedAt = new Date();
	const [org] = await db
		.update(organizations)
		.set({
			orgWalletAddress: orgWallet,
			orgWalletLinkedAt: linkedAt,
			updatedAt: linkedAt,
		})
		.where(eq(organizations.id, activeOrg.organizationId))
		.returning({
			orgWalletAddress: organizations.orgWalletAddress,
			orgWalletLinkedAt: organizations.orgWalletLinkedAt,
		});

	if (!org?.orgWalletAddress || !org.orgWalletLinkedAt) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to link org wallet",
		});
	}

	await invalidateOrgEntitlements(activeOrg.organizationId);

	return {
		orgWalletAddress: org.orgWalletAddress,
		orgWalletLinkedAt: org.orgWalletLinkedAt,
	};
}

export const zOrgsUnlinkWalletBody = z.object({
	organizationId: z.uuid(),
});

export async function orgsUnlinkOrgWallet(
	_wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "org:manage");
	const parsed = zOrgsUnlinkWalletBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}
	if (parsed.data.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}

	const clearedAt = new Date();
	const [org] = await db
		.update(organizations)
		.set({
			orgWalletAddress: null,
			orgWalletLinkedAt: null,
			updatedAt: clearedAt,
		})
		.where(eq(organizations.id, activeOrg.organizationId))
		.returning({
			orgWalletAddress: organizations.orgWalletAddress,
			orgWalletLinkedAt: organizations.orgWalletLinkedAt,
		});

	if (!org) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to unlink org wallet",
		});
	}

	await invalidateOrgEntitlements(activeOrg.organizationId);

	return {
		orgWalletAddress: null,
		orgWalletLinkedAt: null,
	} satisfies {
		orgWalletAddress: null;
		orgWalletLinkedAt: null;
	};
}
