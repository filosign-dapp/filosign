import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { listUserDocumentedErrors } from "../src/get-error-definition";

const repoRoot = join(import.meta.dir, "../../..");
const helpErrorsDir = join(repoRoot, "apps/astro/src/content/help-errors");

describe("catalog MDX sync", () => {
	for (const { code, supportSlug } of listUserDocumentedErrors()) {
		test(`${code} → help-errors/${supportSlug}.mdx`, () => {
			const path = join(helpErrorsDir, `${supportSlug}.mdx`);
			expect(existsSync(path)).toBe(true);
		});
	}
});
