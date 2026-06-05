export type ComplianceExportEligibility = {
	completedAt: Date | null;
	revokedBeforeCompletedAt: Date | null;
};

/** Unix seconds from chain; null while incomplete or not voided. */
export type ChainComplianceExportEligibility = {
	completedAt: number | null;
	revokedBeforeCompletedAt: number | null;
};

/** Compliance bundle / completion packet export allowed for finalized envelopes. */
export function isComplianceExportAllowed(
	file: ComplianceExportEligibility,
	chain?: ChainComplianceExportEligibility | null,
): boolean {
	if (file.completedAt != null || file.revokedBeforeCompletedAt != null) {
		return true;
	}
	return chain?.completedAt != null || chain?.revokedBeforeCompletedAt != null;
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
