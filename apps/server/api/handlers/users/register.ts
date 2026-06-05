import { throwAppError } from "@filosign/errors/server";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { getAddress } from "viem";
import { z } from "zod";
import { registerUserAccount } from "@/lib/domains/platform-access/utils/register-user";
import { validateFilosignRegistrationSignature } from "@/lib/domains/users/validate-registration-signature";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import { verifyThirdwebAuthTokenWithWallet } from "@/lib/platform/utils/thirdweb";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export const zUserRegisterBody = z.object({
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
	coldRecipientEmail: z.email().optional(),
});

export async function userRegister(body: unknown) {
	const parsedBody = zUserRegisterBody.safeParse(body);

	if (parsedBody.error) {
		throw throwZodBadRequest(parsedBody.error);
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
		throw throwAppError("AUTH.UNAUTHORIZED");
	}

	const email = authResult.data.email ?? "";
	const authProviderId = authResult.data.authProviderId;

	if (!email) {
		throw throwAppError("USERS.EMAIL_REQUIRED");
	}

	if (!authProviderId?.trim()) {
		throw throwAppError("USERS.AUTH_PROVIDER_REQUIRED");
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
		throw throwAppError("USERS.INVALID_REGISTRATION_SIGNATURE");
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
