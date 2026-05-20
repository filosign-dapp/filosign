import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";

export const rpcAuthNonceOutputSchema = z.object({
	nonce: zHexString(),
});

export const rpcAuthVerifyOutputSchema = z.object({
	valid: z.literal(true),
	token: z.string(),
});

export const rpcAuthRefreshOutputSchema = z.object({
	token: z.string(),
});

export const rpcAuthLogoutOutputSchema = z.object({
	ok: z.literal(true),
});
