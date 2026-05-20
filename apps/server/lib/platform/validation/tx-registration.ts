import { isHex } from "viem";
import { z } from "zod";

/**
 * POST /tx/:hash JSON body — may be `{}` when the tx only touches FSManager
 * events; hex public keys required together when indexing KeyRegistry registration.
 */
export const zIndexerTxBody = z
	.looseObject({
		encryptionPublicKey: z.string().optional(),
		signaturePublicKey: z.string().optional(),
		email: z.string().optional(),
		privyDid: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		const enc = data.encryptionPublicKey;
		const sig = data.signaturePublicKey;
		const hasEnc = typeof enc === "string" && enc.trim() !== "";
		const hasSig = typeof sig === "string" && sig.trim() !== "";
		if (!hasEnc && !hasSig) return;
		if (!(hasEnc && hasSig)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"encryptionPublicKey and signaturePublicKey must both be provided for key registration txs",
				path: hasEnc ? ["signaturePublicKey"] : ["encryptionPublicKey"],
			});
			return;
		}
		if (!isHex(enc?.trim())) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "encryptionPublicKey must be hex bytes",
				path: ["encryptionPublicKey"],
			});
		}
		if (!isHex(sig?.trim())) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "signaturePublicKey must be hex bytes",
				path: ["signaturePublicKey"],
			});
		}
	});

export type IndexerTxBodyParsed = z.infer<typeof zIndexerTxBody>;
