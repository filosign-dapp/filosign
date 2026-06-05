import type { Address } from "viem";
import { z } from "zod";
import {
	approveOrganizationSettlementFeatureAccess,
	getOrganizationSettlementFeatureAccess,
	listSettlementFeatureAccessForAdmin,
	rejectOrganizationSettlementFeatureAccess,
	submitOrganizationSettlementFeatureRequest,
} from "@/lib/domains/settlement-access";
import { assertPlatformAdmin } from "@/lib/platform/admin";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export async function settlementAccessGetForOrg(
	wallet: Address,
	organizationId: string,
) {
	return getOrganizationSettlementFeatureAccess(organizationId, {
		callerWallet: wallet,
	});
}

export async function settlementAccessSubmitRequest(
	wallet: Address,
	organizationId: string,
	body: unknown,
) {
	return submitOrganizationSettlementFeatureRequest({
		wallet,
		organizationId,
		body,
	});
}

export async function settlementAdminListAccessRequests(adminWallet: Address) {
	await assertPlatformAdmin(adminWallet);
	const requests = await listSettlementFeatureAccessForAdmin();
	return { requests };
}

export async function settlementAdminApproveAccess(
	adminWallet: Address,
	body: unknown,
) {
	await assertPlatformAdmin(adminWallet);
	const parsed = z
		.object({
			organizationId: z.uuid(),
			reviewNote: z.string().max(2000).optional(),
		})
		.safeParse(body);
	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}
	return approveOrganizationSettlementFeatureAccess({
		adminWallet,
		organizationId: parsed.data.organizationId,
		reviewNote: parsed.data.reviewNote,
	});
}

export async function settlementAdminRejectAccess(
	adminWallet: Address,
	body: unknown,
) {
	await assertPlatformAdmin(adminWallet);
	const parsed = z
		.object({
			organizationId: z.uuid(),
			reviewNote: z.string().max(2000).optional(),
		})
		.safeParse(body);
	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}
	return rejectOrganizationSettlementFeatureAccess({
		adminWallet,
		organizationId: parsed.data.organizationId,
		reviewNote: parsed.data.reviewNote,
	});
}
