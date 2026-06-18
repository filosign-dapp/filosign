import { throwAppError } from "@filosign/errors/server";
import {
	ACTIVE_PILOT_ADDENDUM_SHA256,
	ACTIVE_PILOT_ADDENDUM_VERSION,
	ACTIVE_PRIVACY_SHA256,
	ACTIVE_PRIVACY_VERSION,
	ACTIVE_TERMS_SHA256,
	ACTIVE_TERMS_VERSION,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { getAddress } from "viem";
import { z } from "zod";
import type { OrpcContext } from "@/api/orpc/context";
import { resolvePlatformInviteKind } from "@/lib/domains/platform-access";
import { registerUserAccount } from "@/lib/domains/platform-access/utils/register-user";
import { validateFilosignRegistrationSignature } from "@/lib/domains/users/validate-registration-signature";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import { resolveClientIpFromRequest } from "@/lib/platform/utils/client-ip";
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
	acceptTerms: z.literal(true),
	businessUseAttestation: z.literal(true),
	termsVersion: z.string().min(1),
	privacyVersion: z.string().min(1),
	termsSha256: z.string().length(64),
	privacySha256: z.string().length(64),
	acceptPilotAddendum: z.literal(true).optional(),
	addendumVersion: z.string().min(1).optional(),
	addendumSha256: z.string().length(64).optional(),
});

export async function userRegister(context: OrpcContext, body: unknown) {
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
		businessUseAttestation,
		termsVersion,
		privacyVersion,
		termsSha256,
		privacySha256,
		acceptPilotAddendum,
		addendumVersion,
		addendumSha256,
	} = parsedBody.data;

	if (
		termsVersion !== ACTIVE_TERMS_VERSION ||
		privacyVersion !== ACTIVE_PRIVACY_VERSION ||
		termsSha256 !== ACTIVE_TERMS_SHA256 ||
		privacySha256 !== ACTIVE_PRIVACY_SHA256
	) {
		throw throwAppError("USERS.INVALID_TERMS_VERSION");
	}

	if (platformInviteToken?.trim()) {
		const inviteKind = await resolvePlatformInviteKind(platformInviteToken);
		if (inviteKind === "partner_trial") {
			if (
				acceptPilotAddendum !== true ||
				addendumVersion !== ACTIVE_PILOT_ADDENDUM_VERSION ||
				addendumSha256 !== ACTIVE_PILOT_ADDENDUM_SHA256
			) {
				throw throwAppError("USERS.PILOT_ADDENDUM_REQUIRED");
			}
		}
	}

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
		termsVersion,
		privacyVersion,
		termsSha256,
		privacySha256,
		businessUseAttested: businessUseAttestation,
		ipAddress: resolveClientIpFromRequest(context.hono.req),
		userAgent: context.hono.req.header("user-agent"),
		...(acceptPilotAddendum === true && addendumVersion && addendumSha256
			? {
					pilotAddendum: {
						addendumVersion,
						addendumSha256,
					},
				}
			: {}),
	});

	trackServerEvent({
		distinctId: wallet,
		event: SERVER_ANALYTICS_EVENTS.userRegistered,
		properties: { entry: "organic" },
	});

	return {};
}
