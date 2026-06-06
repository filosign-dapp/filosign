/**
 * Ping IndexNow after production builds (Bing, Yandex, and partners).
 * Skips localhost and when INDEXNOW_SKIP=1.
 *
 * Key file must stay at public/{INDEXNOW_KEY}.txt (copied to dist on build).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Must match `public/{key}.txt` filename and hosted key file on filosign.xyz. */
export const INDEXNOW_KEY = "8f3c2a1b-4d5e-6f70-8a9b-0c1d2e3f4a5b";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(scriptDir, "..", "dist");

function siteOrigin(): string {
	return (process.env.PUBLIC_ASTRO_URL ?? "https://filosign.xyz").replace(
		/\/$/,
		"",
	);
}

function shouldSkip(origin: string): string | null {
	if (
		process.env.INDEXNOW_SKIP === "1" ||
		process.env.INDEXNOW_SKIP === "true"
	) {
		return "INDEXNOW_SKIP set";
	}

	let hostname: string;
	try {
		hostname = new URL(origin).hostname;
	} catch {
		return "invalid PUBLIC_ASTRO_URL";
	}

	if (hostname === "localhost" || hostname === "127.0.0.1") {
		return "local build";
	}

	if (!existsSync(join(distDir, "sitemap-0.xml"))) {
		return "sitemap-0.xml missing (run astro build first)";
	}

	return null;
}

function urlsFromSitemap(xml: string): string[] {
	return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function pingIndexNow(): Promise<void> {
	const origin = siteOrigin();
	const skipReason = shouldSkip(origin);
	if (skipReason) {
		console.log(`[indexnow] skipped (${skipReason})`);
		return;
	}

	const xml = readFileSync(join(distDir, "sitemap-0.xml"), "utf8");
	const urlList = urlsFromSitemap(xml);
	if (urlList.length === 0) {
		console.warn("[indexnow] no URLs in sitemap");
		return;
	}

	const host = new URL(origin).host;
	const response = await fetch("https://api.indexnow.org/indexnow", {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=utf-8" },
		body: JSON.stringify({
			host,
			key: INDEXNOW_KEY,
			keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
			urlList,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		console.warn(`[indexnow] ping failed (${response.status}): ${body}`);
		return;
	}

	console.log(`[indexnow] submitted ${urlList.length} URLs for ${host}`);
}

pingIndexNow().catch((error: unknown) => {
	console.warn("[indexnow] error:", error);
});
