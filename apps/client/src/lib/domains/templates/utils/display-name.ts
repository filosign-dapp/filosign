const PDF_EXTENSION = /\.pdf$/i;
const OPAQUE_STORAGE_NAME =
	/^filosign-(?:file-)?record-[a-z0-9]+(?:-\d{4}-\d{2}-\d{2}T[\d-]+)?/i;

export function stripPdfExtension(name: string): string {
	return name.replace(PDF_EXTENSION, "").trim();
}

/** Human-friendly template title for UI and save defaults. */
export function deriveTemplateDisplayName(
	raw: string | undefined | null,
	fallback = "New template",
): string {
	const stripped = stripPdfExtension(raw?.trim() ?? "");
	if (!stripped) return fallback;
	if (OPAQUE_STORAGE_NAME.test(stripped) || stripped.length > 64) {
		return fallback;
	}
	return stripped;
}

/** Short label for cramped chrome; full value should go in `title`. */
export function truncateTemplateHeaderTitle(
	name: string,
	maxLength = 36,
): string {
	const trimmed = name.trim();
	if (trimmed.length <= maxLength) return trimmed;
	return `${trimmed.slice(0, maxLength - 1)}…`;
}
