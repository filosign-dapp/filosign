import { zipSync } from "fflate";
import { downloadBlobBytes } from "./build";

export function sanitizeZipSegment(name: string): string {
	return name.replace(/[/\\]/g, "_").slice(0, 200) || "document";
}

export function uniqueZipEntryName(
	baseName: string,
	used: Set<string>,
): string {
	const sanitized = sanitizeZipSegment(baseName);
	if (!used.has(sanitized)) {
		used.add(sanitized);
		return sanitized;
	}
	const dot = sanitized.lastIndexOf(".");
	const stem = dot > 0 ? sanitized.slice(0, dot) : sanitized;
	const ext = dot > 0 ? sanitized.slice(dot) : "";
	let i = 2;
	while (used.has(`${stem}-${i}${ext}`)) {
		i += 1;
	}
	const next = `${stem}-${i}${ext}`;
	used.add(next);
	return next;
}

export function safePieceCidDownloadBasename(pieceCid: string): string {
	return pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
}

export function downloadZipEntries(
	entries: Record<string, Uint8Array>,
	filenameBase: string,
) {
	const zipped = zipSync(entries, { level: 6 });
	downloadBlobBytes(zipped, filenameBase, "application/zip", "zip");
}
