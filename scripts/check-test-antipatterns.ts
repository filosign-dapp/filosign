#!/usr/bin/env bun
/**
 * Fails when test files contain export-only anti-patterns (see TESTING.md).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SCAN_ROOTS = ["apps", "packages", "oss"] as const;

const PATTERNS: { label: string; regex: RegExp }[] = [
	{ label: "export-only assertion", regex: /\bis exported\b/i },
	{
		label: "typeof export check",
		regex: /typeof\s+\w+\.\w+\s*===\s*["']function["']/,
	},
	{ label: "module exports smoke test", regex: /\bmodule exports\b/i },
];

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		const stat = statSync(path);
		if (stat.isDirectory()) {
			if (
				name === "node_modules" ||
				name === ".git" ||
				name === ".bun" ||
				name === "dist" ||
				name === "build"
			) {
				continue;
			}
			walk(path, out);
		} else if (
			name.endsWith(".test.ts") ||
			name.endsWith(".test.tsx") ||
			name.endsWith(".spec.ts")
		) {
			out.push(path);
		}
	}
	return out;
}

const hits: { file: string; label: string; line: number; text: string }[] = [];
const rootDir = join(import.meta.dir, "..");

for (const scanRoot of SCAN_ROOTS) {
	const base = join(rootDir, scanRoot);
	for (const file of walk(base)) {
		const rel = relative(rootDir, file);
		if (rel.startsWith("oss/packages/contracts/test/")) continue;

		const lines = readFileSync(file, "utf8").split("\n");
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] ?? "";
			for (const { label, regex } of PATTERNS) {
				if (regex.test(line)) {
					hits.push({
						file: rel,
						label,
						line: i + 1,
						text: line.trim(),
					});
				}
			}
		}
	}
}

if (hits.length > 0) {
	console.error("Test anti-patterns found (see TESTING.md):\n");
	for (const hit of hits) {
		console.error(`  ${hit.file}:${hit.line} [${hit.label}]`);
		console.error(`    ${hit.text}`);
	}
	process.exit(1);
}

console.log("check-test-antipatterns: ok");
