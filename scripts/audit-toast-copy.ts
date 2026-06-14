#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { join } from "node:path";
/**
 * Fails CI if user toast literals contain internal jargon.
 * Run: bun run audit:toast-copy
 */
import { Glob } from "bun";

const ROOT = join(import.meta.dir, "..");
const CLIENT_SRC = join(ROOT, "apps/client/src");
const TOASTS_PATH = join(CLIENT_SRC, "lib/copy/toasts.ts");

const BANNED = [
	/\bcold invite\b/i,
	/\bmerkle\b/i,
	/\bon-?chain\b/i,
	/\broster change\b/i,
	/\btreasury\b/i,
	/\bdecrypt(ion|ed)?\b/i,
	/\bencryption keys\b/i,
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

function scanToastCalls(source: string, path: string): string[] {
	const hits: string[] = [];
	const pattern =
		/toast\.(?:error|success|message|info|warning)\(\s*(["'`])([\s\S]*?)\1/g;
	let match: RegExpExecArray | null = pattern.exec(source);
	while (match !== null) {
		const literal = match[2];
		for (const banned of BANNED) {
			if (banned.test(literal)) {
				hits.push(`${path}: ${literal.slice(0, 100)}`);
			}
		}
		match = pattern.exec(source);
	}
	return hits;
}

function scanLiterals(literals: string[], path: string): string[] {
	const hits: string[] = [];
	for (const literal of literals) {
		for (const banned of BANNED) {
			if (banned.test(literal)) {
				hits.push(`${path}: ${literal.slice(0, 100)}`);
			}
		}
	}
	return hits;
}

const offenders = [
	...scanLiterals(
		collectStringLiterals(readFileSync(TOASTS_PATH, "utf8")),
		TOASTS_PATH,
	),
];

const glob = new Glob("**/*.{ts,tsx}");
for (const abs of glob.scanSync({ cwd: CLIENT_SRC, absolute: true })) {
	if (abs.includes("/tests/") || abs.endsWith("/lib/copy/toast.ts")) continue;
	const source = readFileSync(abs, "utf8");
	if (!source.includes("toast.")) continue;
	offenders.push(...scanToastCalls(source, abs));
}

if (offenders.length > 0) {
	console.error("Banned jargon in user toasts:\n");
	for (const line of offenders) console.error(`  ${line}`);
	process.exit(1);
}

console.log("Toast copy audit passed.");
