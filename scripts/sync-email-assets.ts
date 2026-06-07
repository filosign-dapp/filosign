#!/usr/bin/env bun
/**
 * Sync React Email 01-Barebone decorative assets into apps/astro/public/emails/.
 *
 * Source: https://github.com/resend/react-email (MIT) apps/demo/emails/static/barebones
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const REPO = "resend/react-email";
const BRANCH = "canary";
const STATIC_PREFIX = "apps/demo/emails/static";

/** Barebones hero used by welcome-layout. */
const WHITELIST = ["barebones/barebones-image.png"] as const;

const ROOT = join(import.meta.dir, "..");
const TARGET = join(ROOT, "apps/astro/public/emails");

async function downloadFile(relativePath: string): Promise<void> {
	const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${STATIC_PREFIX}/${relativePath}`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to download ${relativePath}: ${res.status}`);
	}
	const dest = join(TARGET, relativePath);
	await mkdir(dirname(dest), { recursive: true });
	const buf = Buffer.from(await res.arrayBuffer());
	await writeFile(dest, buf);
}

async function main(): Promise<void> {
	console.info(
		`Downloading ${WHITELIST.length} barebones asset(s) to apps/astro/public/emails/…`,
	);
	for (const file of WHITELIST) {
		await downloadFile(file);
	}
	console.info("Done.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
