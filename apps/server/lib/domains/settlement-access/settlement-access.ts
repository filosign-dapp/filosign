import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { assertOrgPermission, resolveActiveOrg } from "@/lib/domains/orgs";
import { isPlatformAdminForWallet } from "@/lib/platform/admin";
import db from "@/lib/platform/db";

function settlementAccessSchema() {
	const { organizationSettlementFeatureAccess, organizations } = db.schema;
	return { organizationSettlementFeatureAccess, organizations };
}

export { SETTLEMENT_FEATURE_TERMS_VERSION };

export function settlementFeatureAccessApprovedForPlatformAdmin() {
	return {
		status: "approved" as const,
		termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
		currentTermsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
		termsCurrent: true,
	};
}

export async function getOrganizationSettlementFeatureAccess(
	organizationId: string,
	options?: { callerWallet?: Address },
) {
	if (
		options?.callerWallet &&
		(await isPlatformAdminForWallet(options.callerWallet))
	) {
		return settlementFeatureAccessApprovedForPlatformAdmin();
	}
	const { organizationSettlementFeatureAccess } = settlementAccessSchema();
	const [row] = await db
		.select({
			status: organizationSettlementFeatureAccess.status,
			termsVersion: organizationSettlementFeatureAccess.termsVersion,
			acceptedAt: organizationSettlementFeatureAccess.acceptedAt,
			acceptedByWallet: organizationSettlementFeatureAccess.acceptedByWallet,
			useCase: organizationSettlementFeatureAccess.useCase,
			reviewedAt: organizationSettlementFeatureAccess.reviewedAt,
			reviewNote: organizationSettlementFeatureAccess.reviewNote,
		})
		.from(organizationSettlementFeatureAccess)
		.where(
			eq(organizationSettlementFeatureAccess.organizationId, organizationId),
		)
		.limit(1);

	if (!row) {
		return {
			status: "none" as const,
			termsVersion: null,
			currentTermsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
		};
	}

	return {
		status: row.status,
		termsVersion: row.termsVersion,
		currentTermsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
		acceptedAt: row.acceptedAt.toISOString(),
		acceptedByWallet: row.acceptedByWallet,
		useCase: row.useCase,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		reviewNote: row.reviewNote,
		termsCurrent: row.termsVersion === SETTLEMENT_FEATURE_TERMS_VERSION,
	};
}

export async function submitOrganizationSettlementFeatureRequest(args: {
	wallet: Address;
	organizationId: string;
	body: unknown;
}) {
	const activeOrg = await resolveActiveOrg(args.wallet, args.organizationId);
	assertOrgPermission(activeOrg, "billing:manage");

	const parsed = z
		.object({
			acceptTerms: z.literal(true, {
				error: "You must accept the Settlement Feature Addendum",
			}),
			sanctionsSelfCert: z.literal(true, {
				error: "You must confirm sanctions and export compliance",
			}),
			useCase: z.string().min(10).max(2000),
			termsVersion: z.string().min(1),
		})
		.safeParse(args.body);

	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	if (parsed.data.termsVersion !== SETTLEMENT_FEATURE_TERMS_VERSION) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Settlement terms version is outdated; refresh and accept the current addendum",
		});
	}

	const { organizationSettlementFeatureAccess } = settlementAccessSchema();
	const now = new Date();
	const [existing] = await db
		.select({ status: organizationSettlementFeatureAccess.status })
		.from(organizationSettlementFeatureAccess)
		.where(
			eq(
				organizationSettlementFeatureAccess.organizationId,
				args.organizationId,
			),
		)
		.limit(1);

	if (existing?.status === "approved") {
		return getOrganizationSettlementFeatureAccess(args.organizationId);
	}

	if (existing?.status === "pending") {
		throw new ORPCError("CONFLICT", {
			message: "A payout attachment access request is already pending review",
		});
	}

	await db
		.insert(organizationSettlementFeatureAccess)
		.values({
			organizationId: args.organizationId,
			status: "pending",
			termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
			acceptedAt: now,
			acceptedByWallet: getAddress(args.wallet),
			useCase: parsed.data.useCase.trim(),
			sanctionsSelfCertAt: now,
			reviewedAt: null,
			reviewedByAdminWallet: null,
			reviewNote: null,
		})
		.onConflictDoUpdate({
			target: organizationSettlementFeatureAccess.organizationId,
			set: {
				status: "pending",
				termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
				acceptedAt: now,
				acceptedByWallet: getAddress(args.wallet),
				useCase: parsed.data.useCase.trim(),
				sanctionsSelfCertAt: now,
				reviewedAt: null,
				reviewedByAdminWallet: null,
				reviewNote: null,
				updatedAt: now,
			},
		});

	return getOrganizationSettlementFeatureAccess(args.organizationId);
}

export async function assertOrganizationSettlementFeatureApproved(
	organizationId: string,
	options?: { callerWallet?: Address },
) {
	if (
		options?.callerWallet &&
		(await isPlatformAdminForWallet(options.callerWallet))
	) {
		return;
	}

	const access = await getOrganizationSettlementFeatureAccess(organizationId);
	if (access.status !== "approved") {
		throw new ORPCError("FORBIDDEN", {
			message:
				"Payout attachment is not enabled for this workspace. Request access in workspace settings.",
		});
	}
	if (!access.termsCurrent) {
		throw new ORPCError("FORBIDDEN", {
			message:
				"Settlement Feature Addendum was updated. Request payout attachment access again with the current terms.",
		});
	}
}

export async function listSettlementFeatureAccessForAdmin() {
	const { organizationSettlementFeatureAccess, organizations } =
		settlementAccessSchema();
	const rows = await db
		.select({
			organizationId: organizationSettlementFeatureAccess.organizationId,
			organizationName: organizations.name,
			status: organizationSettlementFeatureAccess.status,
			termsVersion: organizationSettlementFeatureAccess.termsVersion,
			acceptedAt: organizationSettlementFeatureAccess.acceptedAt,
			acceptedByWallet: organizationSettlementFeatureAccess.acceptedByWallet,
			useCase: organizationSettlementFeatureAccess.useCase,
			reviewedAt: organizationSettlementFeatureAccess.reviewedAt,
			reviewedByAdminWallet:
				organizationSettlementFeatureAccess.reviewedByAdminWallet,
			reviewNote: organizationSettlementFeatureAccess.reviewNote,
		})
		.from(organizationSettlementFeatureAccess)
		.innerJoin(
			organizations,
			eq(organizationSettlementFeatureAccess.organizationId, organizations.id),
		)
		.orderBy(desc(organizationSettlementFeatureAccess.updatedAt));

	return rows.map((row) => ({
		...row,
		acceptedAt: row.acceptedAt.toISOString(),
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
	}));
}

export async function approveOrganizationSettlementFeatureAccess(args: {
	adminWallet: Address;
	organizationId: string;
	reviewNote?: string;
}) {
	const { organizationSettlementFeatureAccess } = settlementAccessSchema();
	const now = new Date();
	const updated = await db
		.update(organizationSettlementFeatureAccess)
		.set({
			status: "approved",
			reviewedAt: now,
			reviewedByAdminWallet: getAddress(args.adminWallet),
			reviewNote: args.reviewNote?.trim() || null,
			updatedAt: now,
		})
		.where(
			eq(
				organizationSettlementFeatureAccess.organizationId,
				args.organizationId,
			),
		)
		.returning({
			organizationId: organizationSettlementFeatureAccess.organizationId,
		});

	if (updated.length === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "No settlement feature access request for this workspace",
		});
	}

	return getOrganizationSettlementFeatureAccess(args.organizationId);
}

export async function rejectOrganizationSettlementFeatureAccess(args: {
	adminWallet: Address;
	organizationId: string;
	reviewNote?: string;
}) {
	const { organizationSettlementFeatureAccess } = settlementAccessSchema();
	const now = new Date();
	const updated = await db
		.update(organizationSettlementFeatureAccess)
		.set({
			status: "rejected",
			reviewedAt: now,
			reviewedByAdminWallet: getAddress(args.adminWallet),
			reviewNote: args.reviewNote?.trim() || null,
			updatedAt: now,
		})
		.where(
			eq(
				organizationSettlementFeatureAccess.organizationId,
				args.organizationId,
			),
		)
		.returning({
			organizationId: organizationSettlementFeatureAccess.organizationId,
		});

	if (updated.length === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "No settlement feature access request for this workspace",
		});
	}

	return getOrganizationSettlementFeatureAccess(args.organizationId);
}
