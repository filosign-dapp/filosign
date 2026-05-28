import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";
import { zIndexerTxBody } from "@/lib/platform/validation/tx-registration";

describe("zodSafeParseMessage", () => {
	test("extracts first field issue", () => {
		const Schema = z.object({
			a: z.string().min(1),
		});
		const r = Schema.safeParse({ a: "" });
		expect(r.success).toBe(false);
		if (r.success) return;
		expect(zodSafeParseMessage(r.error).length).toBeGreaterThan(0);
	});
});

describe("zIndexerTxBody", () => {
	test("accepts empty object", () => {
		const r = zIndexerTxBody.safeParse({});
		expect(r.success).toBe(true);
	});

	test("accepts undefined", () => {
		const r = zIndexerTxBody.safeParse(undefined);
		expect(r.success).toBe(true);
	});
});
