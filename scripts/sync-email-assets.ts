#!/usr/bin/env bun
/**
 * Sync React Email demo decorative assets into apps/astro/public/emails/.
 *
 * Source: https://github.com/resend/react-email (MIT) apps/demo/emails/static
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const REPO = "resend/react-email";
const BRANCH = "canary";
const STATIC_PREFIX = "apps/demo/emails/static";

/** Only assets referenced by production email templates. */
const WHITELIST = [
	"collage/collage-image-1.png",
	"dither/dither-image-1.png",
	"skin/skin-image-1.png",
	"tech/tech-image.png",
	"shared/social-x-white.png",
	"shared/social-x-black.png",
] as const;

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
		`Downloading ${WHITELIST.length} react-email demo assets to apps/astro/public/emails/…`,
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
