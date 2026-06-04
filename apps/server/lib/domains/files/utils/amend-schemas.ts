import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import z from "zod";

export const zPendingWarmSignerE2ee = z.object({
	kind: z.literal("warm"),
	wallet: zEvmAddress(),
	kemCiphertext: zHexString(),
	encryptedEncryptionKey: zHexString(),
});

export const zPendingColdSignerE2ee = z.object({
	kind: z.literal("cold"),
	email: z.email(),
	inviteToken: z.string().min(1),
	wrappedEncryptionKey: zHexString(),
});

export const zNewSignerE2ee = z.discriminatedUnion("kind", [
	zPendingWarmSignerE2ee,
	zPendingColdSignerE2ee,
]);

export const zProposeSignerReplacementBody = z.object({
	pieceCid: z.string().min(1),
	recaller: zEvmAddress(),
	oldCommitment: zHexString(),
	newCommitment: zHexString(),
	timestamp: z.number().int().positive(),
	signature: zHexString(),
	newSignerE2ee: zNewSignerE2ee,
});

export const zExecuteSignerReplacementBody = z.object({
	pieceCid: z.string().min(1),
	recaller: zEvmAddress(),
});

export const zCancelSignerReplacementBody = z.object({
	pieceCid: z.string().min(1),
	recaller: zEvmAddress(),
	timestamp: z.number().int().positive(),
	signature: zHexString(),
});
