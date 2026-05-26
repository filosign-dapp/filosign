import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import { z } from "zod";
import { validateFilosignRegistrationSignature } from "@/lib/domains/users/validate-registration-signature";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import { verifyThirdwebAuthTokenWithWallet } from "@/lib/platform/utils/thirdweb";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { users } = db.schema;

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

	const [existing] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, wallet));

	if (existing) {
		return {};
	}

	const insertRes = await tryCatch(
		db.insert(users).values({
			walletAddress: wallet,
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
		}),
	);

	if (insertRes.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Failed to register user: ${insertRes.error.message}`,
		});
	}

	trackServerEvent({
		distinctId: wallet,
		event: SERVER_ANALYTICS_EVENTS.userRegistered,
		properties: { entry: "organic" },
	});

	return {};
}
