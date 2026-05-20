import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import { fsContracts } from "@/lib/platform/evm";
import { processTransaction } from "@/lib/platform/indexer/process";
import { verifyThirdwebAuthTokenWithWallet } from "@/lib/platform/utils/thirdweb";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { FSKeyRegistry } = fsContracts;

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
	idToken: z.string().min(1).optional(),
	skipToken: z.boolean().optional(),
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
		skipToken,
	} = parsedBody.data;

	let email: string;
	let privyDid: string;

	if (skipToken) {
		email = `dev-${walletAddress}@filosign.local`;
		privyDid = `did:dev:${walletAddress}`;
	} else if (idToken) {
		const authResult = await tryCatch(
			verifyThirdwebAuthTokenWithWallet(idToken, walletAddress),
		);

		if (authResult.error) {
			throw new ORPCError("UNAUTHORIZED", {
				message: `Wallet auth verification failed: ${authResult.error.message}`,
			});
		}

		email = authResult.data.email ?? "";
		privyDid = authResult.data.privyDid;
	} else {
		throw new ORPCError("BAD_REQUEST", {
			message: "idToken or skipToken required",
		});
	}

	if (!email) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Email is required for registration. Please log in with email or Google.",
		});
	}

	const valid = await tryCatch(
		FSKeyRegistry.read.validateKeygenDataRegistrationSignature([
			saltPin,
			saltSeed,
			saltChallenge,
			commitmentKem,
			commitmentSig,
			signature,
			walletAddress,
		]),
	);

	if (valid.error || !valid.data) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Error validating signature ${valid.error}`,
		});
	}

	const { FSManager } = fsContracts;
	const alreadyRegistered = await FSManager.read.isRegistered([walletAddress]);
	if (alreadyRegistered) {
		return {};
	}

	const txHash = await tryCatch(
		FSKeyRegistry.write.registerKeygenData([
			saltPin,
			saltSeed,
			saltChallenge,
			commitmentKem,
			commitmentSig,
			signature,
			walletAddress,
		]),
	);
	if (txHash.error || !txHash.data) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Error registering keygen data: ${txHash.error || "Unknown error"}`,
		});
	}

	await processTransaction(txHash.data, {
		encryptionPublicKey,
		signaturePublicKey,
		email,
		privyDid,
	});

	trackServerEvent({
		distinctId: walletAddress,
		event: SERVER_ANALYTICS_EVENTS.userRegistered,
		properties: { entry: skipToken ? "dev" : "organic" },
	});

	return {};
}
