import type { ViewFileResult } from "@filosign/react/files";
import type { ComplianceBundle } from "@filosign/shared";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { buildSignedDocumentPdf } from "./build";
import {
	downloadZipEntries,
	safePieceCidDownloadBasename,
	sanitizeZipSegment,
	uniqueZipEntryName,
} from "./zip-entries";

function signedExportBasename(fileName: string): string {
	const sanitized = sanitizeZipSegment(fileName);
	const dot = sanitized.lastIndexOf(".");
	const stem = dot > 0 ? sanitized.slice(0, dot) : sanitized;
	return `${stem}-signed.pdf`;
}

export function downloadOriginalFilesZip(args: {
	fileData: ViewFileResult;
	pieceCid: string;
}) {
	const used = new Set<string>();
	const entries: Record<string, Uint8Array> = {};
	for (const doc of args.fileData.documents) {
		const name = uniqueZipEntryName(doc.name, used);
		entries[name] = doc.bytes;
	}
	downloadZipEntries(
		entries,
		`filosign-original-files-${safePieceCidDownloadBasename(args.pieceCid)}`,
	);
}

export async function downloadSignedEnvelopeZip(args: {
	fileData: ViewFileResult;
	bundle: ComplianceBundle;
	pieceCid: string;
}) {
	const used = new Set<string>();
	const entries: Record<string, Uint8Array> = {};
	const errors: string[] = [];

	for (const doc of args.fileData.documents) {
		try {
			const signedBytes = await buildSignedDocumentPdf({
				doc,
				bundle: args.bundle,
			});
			const name = uniqueZipEntryName(signedExportBasename(doc.name), used);
			entries[name] = signedBytes;
		} catch (e) {
			const detail = e instanceof Error ? e.message : String(e);
			errors.push(`${doc.name}: ${detail}`);
		}
	}

	if (Object.keys(entries).length === 0) {
		throw new Error(
			errors[0] ?? "Could not build signed copies for this envelope",
		);
	}

	if (errors.length > 0) {
		const preview = errors.slice(0, 3).join("; ");
		const suffix = errors.length > 3 ? ` (+${errors.length - 3} more)` : "";
		const skipped = TOASTS.exports.someSignedFilesSkipped(preview, suffix);
		toastUser.warning(skipped.title, { hint: skipped.hint });
	}

	downloadZipEntries(
		entries,
		`filosign-signed-envelope-${safePieceCidDownloadBasename(args.pieceCid)}`,
	);
}
