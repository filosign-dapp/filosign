import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const ROOT = join(import.meta.dir, "../..");
const TOASTS_PATH = join(ROOT, "src/lib/copy/toasts.ts");
const CLIENT_SRC = join(ROOT, "src");

const BANNED_IN_USER_TOASTS = [
	/\bcold invite\b/i,
	/\bmerkle\b/i,
	/\bon-?chain\b/i,
	/\broster change\b/i,
	/\btreasury\b/i,
	/\bdecrypt(ion|ed)?\b/i,
	/\bencryption keys\b/i,
	/\bmanifest\b/i,
	/\bpiece cid\b/i,
	/\bauth subject\b/i,
];

function collectStringLiterals(source: string): string[] {
	const literals: string[] = [];
	const pattern = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;
	let match: RegExpExecArray | null = pattern.exec(source);
	while (match !== null) {
		if (match[2].length >= 8) literals.push(match[2]);
		match = pattern.exec(source);
	}
	return literals;
}

function scanToastLiterals(source: string): string[] {
	const literals: string[] = [];
	const toastCallPattern =
		/toast\.(?:error|success|message|info|warning)\(\s*(["'`])([\s\S]*?)\1/g;
	let match: RegExpExecArray | null = toastCallPattern.exec(source);
	while (match !== null) {
		literals.push(match[2]);
		match = toastCallPattern.exec(source);
	}
	return literals;
}

describe("toast copy guardrails", () => {
	it("toasts.ts avoids banned internal jargon", () => {
		const source = readFileSync(TOASTS_PATH, "utf8");
		for (const literal of collectStringLiterals(source)) {
			for (const banned of BANNED_IN_USER_TOASTS) {
				expect(literal).not.toMatch(banned);
			}
		}
	});

	it("inline toast literals avoid banned jargon", () => {
		const glob = new Glob("**/*.{ts,tsx}");
		const offenders: string[] = [];

		for (const abs of glob.scanSync({ cwd: CLIENT_SRC, absolute: true })) {
			if (abs.includes("/tests/")) continue;
			const source = readFileSync(abs, "utf8");
			if (!source.includes("toast.")) continue;

			for (const literal of scanToastLiterals(source)) {
				for (const banned of BANNED_IN_USER_TOASTS) {
					if (banned.test(literal)) {
						offenders.push(`${abs}: ${literal.slice(0, 80)}`);
					}
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
