export const SIGNABLE_DOCUMENT_LIMITS = {
	maxBytesPerFile: 10 * 1024 * 1024,
	maxPagesPerDocument: 500,
} as const;

const SIGNABLE_IMAGE_MIMES = new Set([
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
	"image/gif",
]);

const EXTENSION_MIME: Record<string, string> = {
	pdf: "application/pdf",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
};

export const SIGNABLE_DOCUMENT_ACCEPT = {
	mimes: ["application/pdf", ...SIGNABLE_IMAGE_MIMES] as const,
	extensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"] as const,
};

export type SignableDocumentKind = "pdf" | "image" | "unsupported";

function extensionFromName(name: string): string | null {
	const base = name.replace(/^.*[/\\]/, "").trim();
	const dot = base.lastIndexOf(".");
	if (dot <= 0 || dot === base.length - 1) return null;
	return base.slice(dot + 1).toLowerCase();
}

export function resolveSignableDocumentMime(
	name: string,
	browserMime?: string,
): string {
	const mime = browserMime?.trim().toLowerCase();
	if (mime) return mime;
	const ext = extensionFromName(name);
	if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];
	return "";
}

export function inferSignableDocumentKind(
	name: string,
	browserMime?: string,
): SignableDocumentKind {
	const mime = resolveSignableDocumentMime(name, browserMime);
	if (mime === "application/pdf") return "pdf";
	if (SIGNABLE_IMAGE_MIMES.has(mime)) return "image";
	return "unsupported";
}

export function isAcceptedSignableDocumentUpload(
	name: string,
	browserMime?: string,
): boolean {
	return inferSignableDocumentKind(name, browserMime) !== "unsupported";
}

export function validateSignableDocumentUpload(args: {
	name: string;
	sizeBytes: number;
	browserMime?: string;
}):
	| { ok: true; kind: SignableDocumentKind; mimeType: string }
	| { ok: false; code: string; message: string } {
	const rawName = args.name.trim();
	if (!rawName) {
		return {
			ok: false,
			code: "INVALID_NAME",
			message: "File name is required",
		};
	}
	if (args.sizeBytes <= 0) {
		return {
			ok: false,
			code: "EMPTY_FILE",
			message: `${rawName} is empty`,
		};
	}
	if (args.sizeBytes > SIGNABLE_DOCUMENT_LIMITS.maxBytesPerFile) {
		const mb = Math.round(
			SIGNABLE_DOCUMENT_LIMITS.maxBytesPerFile / (1024 * 1024),
		);
		return {
			ok: false,
			code: "FILE_TOO_LARGE",
			message: `${rawName} exceeds the ${mb}MB limit`,
		};
	}
	const kind = inferSignableDocumentKind(rawName, args.browserMime);
	if (kind === "unsupported") {
		return {
			ok: false,
			code: "UNSUPPORTED_TYPE",
			message: `${rawName} is not a supported document type`,
		};
	}
	return {
		ok: true,
		kind,
		mimeType: resolveSignableDocumentMime(rawName, args.browserMime),
	};
}

export function canonicalSignablePdfFileName(displayName: string): string {
	const base = displayName.replace(/^.*[/\\]/, "").trim() || "document";
	const dot = base.lastIndexOf(".");
	const stem = dot > 0 ? base.slice(0, dot) : base;
	return `${stem}.pdf`;
}
