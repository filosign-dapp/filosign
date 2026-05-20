import { expect, test } from "bun:test";
import { z } from "zod";
import { zodSafeParseMessage } from "./zodHttp";

test("zodSafeParseMessage extracts first field issue", () => {
	const Schema = z.object({
		a: z.string().min(1),
	});
	const r = Schema.safeParse({ a: "" });
	expect(r.success).toBe(false);
	if (r.success) return;
	expect(zodSafeParseMessage(r.error).length).toBeGreaterThan(0);
});
