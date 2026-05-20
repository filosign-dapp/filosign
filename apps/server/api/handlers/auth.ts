import { signatures, toBytes } from "@filosign/crypto-utils/node";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import {
	type Address,
	type Hash,
	isAddress,
	keccak256,
	numberToHex,
} from "viem";
import z from "zod";
import { MINUTE } from "@/constants";
import db from "@/lib/platform/db";
import { issueJwtToken } from "@/lib/platform/utils/jwt";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const nonces = {} as Record<Address, { nonce: Hash; validTill: number }>;

const { users } = db.schema;

export const zAuthVerifyBody = z.object({
	address: z.string().refine((v) => isAddress(v), {
		message: "Invalid address",
	}),
	signature: zHexString(),
});

export async function authNonce(walletInput: string) {
	const wallet = walletInput.trim();
	if (!wallet || !isAddress(wallet)) {
		throw new ORPCError("BAD_REQUEST", { message: "Missing wallet address" });
	}
	const walletAddr = wallet as Address;
	const nonce = keccak256(
		numberToHex(Math.floor(Date.now() + Math.random() * 1e10)),
	);
	nonces[walletAddr] = { nonce, validTill: Date.now() + 5 * MINUTE };
	return { nonce };
}

export async function authVerify(input: z.infer<typeof zAuthVerifyBody>) {
	const address = input.address as Address;
	const msgData = nonces[address];
	delete nonces[address];

	if (!msgData || msgData.validTill < Date.now()) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Message expired or not found",
		});
	}

	const userRecordResult = await tryCatch(
		db
			.select({
				signaturePublicKey: users.signaturePublicKey,
			})
			.from(users)
			.where(eq(users.walletAddress, address))
			.limit(1),
	);

	if (userRecordResult.error) {
		console.error("[auth.verify] user lookup failed", {
			address,
			error:
				userRecordResult.error instanceof Error
					? userRecordResult.error.message
					: String(userRecordResult.error),
		});
		throw new ORPCError("SERVICE_UNAVAILABLE", {
			message: "Authentication temporarily unavailable",
		});
	}

	const [userRecord] = userRecordResult.data;
	if (!userRecord) {
		throw new ORPCError("UNAUTHORIZED", { message: "You are not registered" });
	}

	const valid = await signatures.verify({
		dl: await signatures.dilithiumInstance(),
		message: toBytes(msgData.nonce),
		signature: toBytes(input.signature),
		publicKey: toBytes(userRecord.signaturePublicKey),
	});

	if (!valid) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}

	await tryCatch(
		db
			.update(users)
			.set({ lastActiveAt: new Date() })
			.where(eq(users.walletAddress, address)),
	);

	const token = issueJwtToken(address);
	return { valid: true as const, token };
}
