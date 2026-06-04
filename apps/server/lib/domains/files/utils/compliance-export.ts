/** Compliance bundle / completion packet export allowed for finalized envelopes. */
export function isComplianceExportAllowed(file: {
	completedAt: Date | null;
	revokedBeforeCompletedAt: Date | null;
}): boolean {
	return file.completedAt != null || file.revokedBeforeCompletedAt != null;
}

export class ExportDocumentSha256MismatchError extends Error {
	constructor() {
		super("documentSha256 does not match the registered envelope root");
		this.name = "ExportDocumentSha256MismatchError";
	}
}

/** When the client supplies a root, it must match the value stored at register. */
export function assertExportDocumentSha256Matches(args: {
	provided: string | undefined;
	registered: string;
}): void {
	const provided = args.provided?.trim();
	if (!provided) return;
	if (provided.toLowerCase() !== args.registered.toLowerCase()) {
		throw new ExportDocumentSha256MismatchError();
	}
}
