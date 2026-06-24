import { throwAppError } from "@filosign/errors/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { assertUserOwnsOrganization } from "@/lib/domains/orgs";
import {
	invalidateOrgEntitlements,
	invalidateUserEntitlements,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import {
	platformInviteRedemptions,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import {
	attachPartnerTrialToExistingOrgWithTx,
	type PartnerInviteTrialContext,
	redeemPlatformInviteOnRegisterWithTx,
	resolvePartnerInviteTrialForWorkspace,
} from "./registration";
import {
	assertWalletEligibleForPartnerTrial,
	canApplyPartnerTrialToOrgSub,
} from "./utils/partner-trial-guards";
import { inviteIsActive, normalizeEmail } from "./utils/shared";

export type RedeemPartnerInviteForExistingUserResult = {
	applied: boolean;
	organizationId: string | null;
	partnerInviteTrial: PartnerInviteTrialContext | null;
};

export async function redeemPartnerInviteForExistingUser(args: {
	wallet: Address;
	email: string;
	platformInviteToken: string;
	organizationId?: string;
}): Promise<RedeemPartnerInviteForExistingUserResult> {
	const wallet = getAddress(args.wallet);
	const emailNorm = normalizeEmail(args.email);
	const token = args.platformInviteToken.trim();
	const targetOrgId = args.organizationId?.trim() || null;

	const txResult = await db.transaction(async (tx) => {
		const [invite] = await tx
			.select()
			.from(platformInvites)
			.where(eq(platformInvites.token, token))
			.limit(1);

		if (!invite || !inviteIsActive(invite)) {
			throwAppError("WORKSPACE.PLATFORM_INVITE_NOT_FOUND");
		}
		if (invite.email && normalizeEmail(invite.email) !== emailNorm) {
			throwAppError("WORKSPACE.PLATFORM_EMAIL_MISMATCH");
		}

		const [existingRedemption] = await tx
			.select({ id: platformInviteRedemptions.id })
			.from(platformInviteRedemptions)
			.where(
				and(
					eq(platformInviteRedemptions.inviteId, invite.id),
					eq(platformInviteRedemptions.walletAddress, wallet),
				),
			)
			.limit(1);

		const alreadyRedeemed = Boolean(existingRedemption);

		if (!alreadyRedeemed) {
			await assertWalletEligibleForPartnerTrial(tx, wallet);
		}

		if (targetOrgId) {
			await assertUserOwnsOrganization(wallet, targetOrgId, tx);

			const [orgSub] = await tx
				.select({
					planId: organizationSubscriptions.planId,
					status: organizationSubscriptions.status,
					provider: organizationSubscriptions.provider,
					periodEnd: organizationSubscriptions.periodEnd,
					dodoSubscriptionId: organizationSubscriptions.dodoSubscriptionId,
				})
				.from(organizationSubscriptions)
				.where(eq(organizationSubscriptions.organizationId, targetOrgId))
				.limit(1);

			if (
				!alreadyRedeemed &&
				!canApplyPartnerTrialToOrgSub(orgSub, new Date())
			) {
				throwAppError("WORKSPACE.PLATFORM_INVITE_PAID_PLAN_BLOCKS");
			}
		}

		await redeemPlatformInviteOnRegisterWithTx(tx, {
			wallet,
			email: emailNorm,
			platformInviteToken: token,
		});

		if (targetOrgId) {
			await attachPartnerTrialToExistingOrgWithTx(tx, {
				creatorWallet: wallet,
				organizationId: targetOrgId,
				requireAttach: true,
			});
		}

		return { organizationId: targetOrgId };
	});

	await invalidateUserEntitlements(wallet);
	if (txResult.organizationId) {
		await invalidateOrgEntitlements(txResult.organizationId);
	}

	const partnerInviteTrial = txResult.organizationId
		? await resolvePartnerInviteTrialForWorkspace({
				wallet,
				organizationId: txResult.organizationId,
			})
		: null;

	return {
		applied: true,
		organizationId: txResult.organizationId,
		partnerInviteTrial,
	};
}

export async function fetchRegisteredUserEmail(
	wallet: Address,
): Promise<string> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, walletNorm))
		.limit(1);

	if (!row?.email?.trim()) {
		throwAppError("USERS.EMAIL_REQUIRED");
	}

	return normalizeEmail(row.email);
}
