import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { getAddress } from "viem";
import { z } from "zod";
import { registerUserAccount } from "@/lib/domains/platform-access/utils/register-user";
import { validateFilosignRegistrationSignature } from "@/lib/domains/users/validate-registration-signature";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import { verifyThirdwebAuthTokenWithWallet } from "@/lib/platform/utils/thirdweb";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const zRegisterBody = z.object({
	saltPin: zHexString(),
	saltSeed: zHexString(),
	saltChallenge: zHexString(),
	commitmentKem: zHexString(),
	commitmentSig: zHexString(),
	signature: zHexString(),
	encryptionPublicKey: zHexString(),
	signaturePublicKey: zHexString(),
	walletAddress: zEvmAddress(),
	idToken: z.string().min(1),
	platformInviteToken: z.string().min(8).optional(),
	setupToken: z.string().min(8).optional(),
	coldInviteToken: z.string().min(8).optional(),
	coldRecipientEmail: z.string().email().optional(),
});

export async function userRegister(body: unknown) {
	const parsedBody = zRegisterBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const {
		saltPin,
		saltSeed,
		saltChallenge,
		commitmentKem,
		commitmentSig,
		signature,
		encryptionPublicKey,
		signaturePublicKey,
		walletAddress,
		idToken,
		platformInviteToken,
		setupToken,
		coldInviteToken,
		coldRecipientEmail,
	} = parsedBody.data;

	const wallet = getAddress(walletAddress);

	const authResult = await tryCatch(
		verifyThirdwebAuthTokenWithWallet(idToken, wallet),
	);

	if (authResult.error) {
		throw new ORPCError("UNAUTHORIZED", {
			message: `Wallet auth verification failed: ${authResult.error.message}`,
		});
	}

	const email = authResult.data.email ?? "";
	const authProviderId = authResult.data.authProviderId;

	if (!email) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Email is required for registration. Please log in with email or Google.",
		});
	}

	if (!authProviderId?.trim()) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Auth provider id is required for registration.",
		});
	}

	const valid = await validateFilosignRegistrationSignature({
		walletAddress: wallet,
		saltPin,
		saltSeed,
		saltChallenge,
		commitmentKem,
		commitmentSig,
		signature,
	});

	if (!valid) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid registration signature",
		});
	}

	await registerUserAccount({
		wallet,
		email,
		authProviderId,
		encryptionPublicKey,
		signaturePublicKey,
		keygenDataJson: {
			saltPin,
			saltSeed,
			saltChallenge,
			commitmentKem,
			commitmentSig,
		},
		gate: {
			platformInviteToken,
			setupToken,
			coldInviteToken,
			coldRecipientEmail,
		},
	});

	trackServerEvent({
		distinctId: wallet,
		event: SERVER_ANALYTICS_EVENTS.userRegistered,
		properties: { entry: "organic" },
	});

	return {};
}
