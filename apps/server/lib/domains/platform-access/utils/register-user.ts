import { throwAppError } from "@filosign/errors/server";
import { signupPolicyIsGated } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";

import {
	assertRegistrationAllowed,
	grantAdminUserTeamsProIfEligibleWithTx,
	linkPaidSetupOnRegisterWithTx,
	previewColdRecipientGate,
	type RegistrationAccessGate,
	redeemPlatformInviteOnRegisterWithTx,
} from "@/lib/domains/platform-access";
import { allowsPlatformAdminAccess } from "@/lib/platform/admin";
import {
	invalidateUserEntitlements,
	invalidateUserExists,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import {
	platformAccessPending,
	platformInviteRedemptions,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";

export type RegisterUserAccountInput = {
	wallet: Address;
	email: string;
	authProviderId: string;
	encryptionPublicKey: string;
	signaturePublicKey: string;
	keygenDataJson: {
		saltPin: string;
		saltSeed: string;
		saltChallenge: string;
		commitmentKem: string;
		commitmentSig: string;
	};
	gate?: RegistrationAccessGate;
};

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

async function userHasGatedRegistrationRecord(
	wallet: Address,
): Promise<boolean> {
	const walletNorm = getAddress(wallet);

	const [subscription] = await db
		.select({ walletAddress: userSubscriptions.walletAddress })
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);
	if (subscription) return true;

	const [redemption] = await db
		.select({ id: platformInviteRedemptions.id })
		.from(platformInviteRedemptions)
		.where(eq(platformInviteRedemptions.walletAddress, walletNorm))
		.limit(1);
	if (redemption) return true;

	const [linkedPending] = await db
		.select({ id: platformAccessPending.id })
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.linkedWallet, walletNorm),
				eq(platformAccessPending.status, "linked"),
			),
		)
		.limit(1);
	if (linkedPending) return true;

	return false;
}

async function completeExistingUserRegistration(args: {
	wallet: Address;
	email: string;
	gate?: RegistrationAccessGate;
}): Promise<void> {
	if (!signupPolicyIsGated(env.DEPLOYMENT)) {
		return;
	}

	const emailNorm = normalizeEmail(args.email);
	const wallet = getAddress(args.wallet);

	if (args.gate?.platformInviteToken?.trim()) {
		const platformInviteToken = args.gate.platformInviteToken;
		await db.transaction(async (tx) => {
			await redeemPlatformInviteOnRegisterWithTx(tx, {
				wallet,
				email: emailNorm,
				platformInviteToken,
			});
		});
		return;
	}

	if (args.gate?.setupToken?.trim()) {
		const setupToken = args.gate.setupToken;
		await db.transaction(async (tx) => {
			await linkPaidSetupOnRegisterWithTx(tx, {
				wallet,
				email: emailNorm,
				setupToken,
			});
		});
		return;
	}

	if (
		args.gate?.coldInviteToken?.trim() &&
		args.gate.coldRecipientEmail?.trim()
	) {
		const preview = await previewColdRecipientGate({
			inviteToken: args.gate.coldInviteToken,
			email: args.gate.coldRecipientEmail,
		});
		if (!preview.valid) {
			throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
				params: { reason: preview.reason ?? "Invalid document invite" },
			});
		}
		if (preview.lockedEmail === emailNorm) {
			return;
		}
		throwAppError("WORKSPACE.PLATFORM_EMAIL_MISMATCH");
	}

	if (await userHasGatedRegistrationRecord(wallet)) {
		return;
	}

	if (allowsPlatformAdminAccess(emailNorm)) {
		await db.transaction(async (tx) => {
			await grantAdminUserTeamsProIfEligibleWithTx(tx, {
				wallet,
				email: emailNorm,
			});
		});
		return;
	}

	throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
		params: {
			reason:
				"Registration incomplete. Open your invite or setup link and try again.",
		},
	});
}

export async function registerUserAccount(
	input: RegisterUserAccountInput,
): Promise<void> {
	const wallet = getAddress(input.wallet);
	const emailNorm = normalizeEmail(input.email);

	const [existing] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, wallet))
		.limit(1);

	if (existing) {
		await completeExistingUserRegistration({
			wallet,
			email: emailNorm,
			gate: input.gate,
		});
		return;
	}

	await assertRegistrationAllowed({
		wallet,
		email: emailNorm,
		gate: input.gate,
	});

	await db.transaction(async (tx) => {
		await tx.insert(users).values({
			walletAddress: wallet,
			email: emailNorm,
			authProviderId: input.authProviderId,
			encryptionPublicKey: input.encryptionPublicKey,
			signaturePublicKey: input.signaturePublicKey,
			keygenDataJson: input.keygenDataJson,
		});

		if (input.gate?.platformInviteToken?.trim()) {
			await redeemPlatformInviteOnRegisterWithTx(tx, {
				wallet,
				email: emailNorm,
				platformInviteToken: input.gate.platformInviteToken,
			});
			return;
		}

		if (input.gate?.setupToken?.trim()) {
			await linkPaidSetupOnRegisterWithTx(tx, {
				wallet,
				email: emailNorm,
				setupToken: input.gate.setupToken,
			});
			return;
		}

		await grantAdminUserTeamsProIfEligibleWithTx(tx, {
			wallet,
			email: emailNorm,
		});
	});

	await invalidateUserExists(wallet);
	await invalidateUserEntitlements(wallet);
}
