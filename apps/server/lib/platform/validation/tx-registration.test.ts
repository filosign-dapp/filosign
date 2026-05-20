import { expect, test } from "bun:test";
import { zIndexerTxBody } from "./tx-registration";

test("zIndexerTxBody accepts empty object for FM-only txs", () => {
	const r = zIndexerTxBody.safeParse({});
	expect(r.success).toBe(true);
});

test("zIndexerTxBody rejects partial keys", () => {
	const r = zIndexerTxBody.safeParse({
		encryptionPublicKey: "0x00",
	});
	expect(r.success).toBe(false);
});

test("zIndexerTxBody accepts paired hex keys", () => {
	const r = zIndexerTxBody.safeParse({
		encryptionPublicKey: "0xaabb",
		signaturePublicKey: "0xccdd",
	});
	expect(r.success).toBe(true);
	if (!r.success) return;
	expect(r.data.encryptionPublicKey?.startsWith("0x")).toBe(true);
});
