import { throwAppError } from "@filosign/errors/server";
import {
	SETTLEMENT_FEATURE_TERMS_VERSION,
	zIsoCountryCode,
} from "@filosign/shared";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { assertOrgPermission, resolveActiveOrg } from "@/lib/domains/orgs/orgs";
import {
	adminListMeta,
	adminListOffset,
} from "@/lib/domains/platform-access/utils/admin-pagination";
import { isPlatformAdminForWallet } from "@/lib/platform/admin";
import { emitPayoutAccessRequestPing } from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

function settlementAccessSchema() {
	const { organizationSettlementFeatureAccess, organizations } = db.schema;
	return { organizationSettlementFeatureAccess, organizations };
}

export { SETTLEMENT_FEATURE_TERMS_VERSION };

export const zSettlementFeatureAccessSubmitBody = z
	.object({
		acceptTerms: z.literal(true, {
			error: "You must accept the Settlement Feature Addendum",
		}),
		sanctionsSelfCert: z.literal(true, {
			error: "You must confirm sanctions and export compliance",
		}),
		useCase: z.string().min(10).max(2000),
		termsVersion: z.string().min(1),
		organizationLegalName: z.string().trim().min(1).max(500),
		organizationCountry: zIsoCountryCode,
		requesterName: z.string().trim().min(1).max(200),
		requesterRole: z.string().trim().min(1).max(200),
		externalWalletAccessRequested: z.boolean().default(false),
		externalWalletUseCase: z.string().max(2000).optional(),
		externalWalletComplianceCert: z.boolean().optional(),
	})
	.superRefine((data, ctx) => {
		if (!data.externalWalletAccessRequested) return;

		const externalUseCase = data.externalWalletUseCase?.trim() ?? "";
		if (externalUseCase.length < 30) {
			ctx.addIssue({
				code: "custom",
				message:
					"Describe who gets paid, how you verify them, and why they cannot be envelope recipients (at least 30 characters).",
				path: ["externalWalletUseCase"],
			});
		}
		if (data.externalWalletComplianceCert !== true) {
			ctx.addIssue({
				code: "custom",
				message:
					"You must confirm sanctions and AML responsibility for external wallet payouts.",
				path: ["externalWalletComplianceCert"],
			});
		}
	});

export function settlementFeatureAccessApprovedForPlatformAdmin() {
	return {
		status: "approved" as const,
		termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
		currentTermsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
		termsCurrent: true,
		externalWalletAccessEnabled: true,
	};
}

function externalWalletIntakeFromSubmit(
	data: z.infer<typeof zSettlementFeatureAccessSubmitBody>,
	now: Date,
) {
	const requested = data.externalWalletAccessRequested === true;
	return {
		externalWalletAccessRequested: requested,
		externalWalletUseCase: requested
			? (data.externalWalletUseCase?.trim() ?? null)
			: null,
		externalWalletComplianceCertAt:
			requested && data.externalWalletComplianceCert === true ? now : null,
	};
}

function mapSettlementFeatureAccessRow(row: {
	status: string;
	termsVersion: string;
	acceptedAt: Date;
	acceptedByWallet: string;
	useCase: string | null;
	reviewedAt: Date | null;
	reviewNote: string | null;
	externalWalletAccessEnabled: boolean;
	externalWalletAccessEnabledAt: Date | null;
	externalWalletAccessRequested: boolean;
	externalWalletUseCase: string | null;
	externalWalletComplianceCertAt: Date | null;
}) {
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
		externalWalletAccessEnabled: row.externalWalletAccessEnabled,
		externalWalletAccessEnabledAt:
			row.externalWalletAccessEnabledAt?.toISOString() ?? null,
		externalWalletAccessRequested: row.externalWalletAccessRequested,
		externalWalletUseCase: row.externalWalletUseCase,
		externalWalletComplianceCertAt:
			row.externalWalletComplianceCertAt?.toISOString() ?? null,
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
			externalWalletAccessEnabled:
				organizationSettlementFeatureAccess.externalWalletAccessEnabled,
			externalWalletAccessEnabledAt:
				organizationSettlementFeatureAccess.externalWalletAccessEnabledAt,
			externalWalletAccessRequested:
				organizationSettlementFeatureAccess.externalWalletAccessRequested,
			externalWalletUseCase:
				organizationSettlementFeatureAccess.externalWalletUseCase,
			externalWalletComplianceCertAt:
				organizationSettlementFeatureAccess.externalWalletComplianceCertAt,
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
			externalWalletAccessEnabled: false,
			externalWalletAccessRequested: false,
		};
	}

	return mapSettlementFeatureAccessRow(row);
}

export async function submitOrganizationSettlementFeatureRequest(args: {
	wallet: Address;
	organizationId: string;
	body: unknown;
	audit: {
		requestIp: string;
		requestUserAgent: string | null;
	};
}) {
	const activeOrg = await resolveActiveOrg(args.wallet, args.organizationId);
	assertOrgPermission(activeOrg, "billing:manage");

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(args.wallet),
		args.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.settlement.basic");

	const parsed = zSettlementFeatureAccessSubmitBody.safeParse(args.body);

	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}

	if (parsed.data.termsVersion !== SETTLEMENT_FEATURE_TERMS_VERSION) {
		throw throwAppError("SETTLEMENTS.TERMS_OUTDATED");
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
		throw throwAppError("SETTLEMENTS.ACCESS_REQUEST_PENDING");
	}

	const intake = {
		organizationLegalName: parsed.data.organizationLegalName,
		organizationCountry: parsed.data.organizationCountry,
		requesterName: parsed.data.requesterName,
		requesterRole: parsed.data.requesterRole,
		requestIp: args.audit.requestIp,
		requestUserAgent: args.audit.requestUserAgent,
		...externalWalletIntakeFromSubmit(parsed.data, now),
	};

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
			...intake,
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
				...intake,
				reviewedAt: null,
				reviewedByAdminWallet: null,
				reviewNote: null,
				updatedAt: now,
			},
		});

	void emitPayoutAccessRequestPing({
		wallet: getAddress(args.wallet),
		organizationId: args.organizationId,
		organizationLegalName: parsed.data.organizationLegalName,
		organizationCountry: parsed.data.organizationCountry,
		useCase: parsed.data.useCase,
		requesterName: parsed.data.requesterName,
		requesterRole: parsed.data.requesterRole,
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
		throw throwAppError("SETTLEMENTS.FEATURE_ACCESS_REQUIRED");
	}
	if (!access.termsCurrent) {
		throw throwAppError("SETTLEMENTS.TERMS_OUTDATED");
	}
}

export async function assertOrganizationExternalWalletAccessEnabled(
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
	if (access.status !== "approved" || !access.termsCurrent) {
		throw throwAppError("SETTLEMENTS.FEATURE_ACCESS_REQUIRED");
	}
	if (!access.externalWalletAccessEnabled) {
		throw throwAppError("SETTLEMENTS.EXTERNAL_WALLET_ACCESS_REQUIRED");
	}
}

export async function listSettlementFeatureAccessForAdmin(args?: {
	page?: number;
	q?: string;
	status?: "all" | "pending" | "approved" | "rejected";
}) {
	const { organizationSettlementFeatureAccess, organizations } =
		settlementAccessSchema();
	const { safePage, offset, pageSize } = adminListOffset(args?.page);
	const filters: SQL[] = [];

	const q = args?.q?.trim();
	if (q) {
		filters.push(ilike(organizations.name, `%${q}%`));
	}

	const status = args?.status ?? "all";
	if (status !== "all") {
		filters.push(eq(organizationSettlementFeatureAccess.status, status));
	}

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [countRow] = await db
		.select({ total: count() })
		.from(organizationSettlementFeatureAccess)
		.innerJoin(
			organizations,
			eq(organizationSettlementFeatureAccess.organizationId, organizations.id),
		)
		.where(where);

	const totalCount = countRow?.total ?? 0;
	const meta = adminListMeta(totalCount, safePage);

	const rows = await db
		.select({
			organizationId: organizationSettlementFeatureAccess.organizationId,
			organizationName: organizations.name,
			status: organizationSettlementFeatureAccess.status,
			termsVersion: organizationSettlementFeatureAccess.termsVersion,
			acceptedAt: organizationSettlementFeatureAccess.acceptedAt,
			acceptedByWallet: organizationSettlementFeatureAccess.acceptedByWallet,
			useCase: organizationSettlementFeatureAccess.useCase,
			organizationLegalName:
				organizationSettlementFeatureAccess.organizationLegalName,
			organizationCountry:
				organizationSettlementFeatureAccess.organizationCountry,
			requesterName: organizationSettlementFeatureAccess.requesterName,
			requesterRole: organizationSettlementFeatureAccess.requesterRole,
			requestIp: organizationSettlementFeatureAccess.requestIp,
			requestUserAgent: organizationSettlementFeatureAccess.requestUserAgent,
			reviewedAt: organizationSettlementFeatureAccess.reviewedAt,
			reviewedByAdminWallet:
				organizationSettlementFeatureAccess.reviewedByAdminWallet,
			reviewNote: organizationSettlementFeatureAccess.reviewNote,
			externalWalletAccessEnabled:
				organizationSettlementFeatureAccess.externalWalletAccessEnabled,
			externalWalletAccessEnabledAt:
				organizationSettlementFeatureAccess.externalWalletAccessEnabledAt,
			externalWalletAccessRequested:
				organizationSettlementFeatureAccess.externalWalletAccessRequested,
			externalWalletUseCase:
				organizationSettlementFeatureAccess.externalWalletUseCase,
			externalWalletComplianceCertAt:
				organizationSettlementFeatureAccess.externalWalletComplianceCertAt,
		})
		.from(organizationSettlementFeatureAccess)
		.innerJoin(
			organizations,
			eq(organizationSettlementFeatureAccess.organizationId, organizations.id),
		)
		.where(where)
		.orderBy(desc(organizationSettlementFeatureAccess.updatedAt))
		.limit(pageSize)
		.offset(offset);

	const items = rows.map((row) => ({
		...row,
		acceptedAt: row.acceptedAt.toISOString(),
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		externalWalletAccessEnabledAt:
			row.externalWalletAccessEnabledAt?.toISOString() ?? null,
		externalWalletComplianceCertAt:
			row.externalWalletComplianceCertAt?.toISOString() ?? null,
	}));

	return { items, ...meta };
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
		throw throwAppError("SETTLEMENTS.ACCESS_REQUEST_NOT_FOUND");
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
		throw throwAppError("SETTLEMENTS.ACCESS_REQUEST_NOT_FOUND");
	}

	return getOrganizationSettlementFeatureAccess(args.organizationId);
}

export async function setOrganizationExternalWalletAccess(args: {
	adminWallet: Address;
	organizationId: string;
	enabled: boolean;
}) {
	const { organizationSettlementFeatureAccess } = settlementAccessSchema();
	const now = new Date();
	const updated = await db
		.update(organizationSettlementFeatureAccess)
		.set({
			externalWalletAccessEnabled: args.enabled,
			externalWalletAccessEnabledAt: args.enabled ? now : null,
			externalWalletAccessEnabledByAdminWallet: args.enabled
				? getAddress(args.adminWallet)
				: null,
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
			status: organizationSettlementFeatureAccess.status,
		});

	const row = updated[0];
	if (!row) {
		throw throwAppError("SETTLEMENTS.ACCESS_REQUEST_NOT_FOUND");
	}
	if (row.status !== "approved") {
		throw throwAppError("SETTLEMENTS.FEATURE_ACCESS_REQUIRED");
	}

	return getOrganizationSettlementFeatureAccess(args.organizationId);
}
