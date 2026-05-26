import { expect, test } from "bun:test";
import { zIndexerTxBody } from "./tx-registration";

test("zIndexerTxBody accepts empty object", () => {
	const r = zIndexerTxBody.safeParse({});
	expect(r.success).toBe(true);
});

test("zIndexerTxBody accepts undefined", () => {
	const r = zIndexerTxBody.safeParse(undefined);
	expect(r.success).toBe(true);
});
