import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const helpErrorsDir = join(
	import.meta.dir,
	"../../../apps/astro/src/content/help-errors",
);
const BOILERPLATE = "Follow the steps shown in the app";

describe("help-errors MDX copy", () => {
	const files = readdirSync(helpErrorsDir).filter((f) => f.endsWith(".mdx"));

	for (const file of files) {
		test(`${file} has no placeholder boilerplate`, () => {
			const content = readFileSync(join(helpErrorsDir, file), "utf8");
			expect(content.includes(BOILERPLATE)).toBe(false);
		});
	}
});
