import type { UserSignatureRole } from "./signature-artifact";

export const DEFAULT_TYPED_SIGNATURE_FONT_ID = "typed" as const;

export type SignerProfileForTypedSignature = {
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	username?: string | null;
};

export function resolveSignerDisplayName(
	profile: SignerProfileForTypedSignature,
): string {
	const first = profile.firstName?.trim() ?? "";
	const last = profile.lastName?.trim() ?? "";
	const fullName = [first, last].filter(Boolean).join(" ").trim();
	if (fullName) return fullName;

	const email = profile.email?.trim();
	if (email) {
		const local = email.split("@")[0]?.trim();
		if (local) return local;
	}

	const username = profile.username?.trim();
	if (username) return username;

	return "Signer";
}

export function resolveTypedSignatureText(args: {
	role: UserSignatureRole;
	profile: SignerProfileForTypedSignature;
}): string {
	const first = args.profile.firstName?.trim() ?? "";
	const last = args.profile.lastName?.trim() ?? "";

	if (args.role === "signature") {
		return resolveSignerDisplayName(args.profile);
	}

	const initials = deriveSignatureInitials(first, last);
	if (initials) return initials;

	const email = args.profile.email?.trim();
	if (email) {
		const ch = email.charAt(0).toUpperCase();
		if (ch) return ch;
	}

	return "S";
}

export type SignatureFontId =
	| "typed"
	| "dancing-script"
	| "great-vibes"
	| "caveat"
	| "satisfy"
	| "kalam"
	| "alex-brush";

export type SignatureFontCatalogEntry = {
	id: SignatureFontId;
	label: string;
	/** CSS font-family value for HTML preview and canvas rasterization */
	cssFamily: string;
	/** @fontsource package name (omit for system fonts) */
	fontsourcePackage?: string;
	legacyIds: string[];
	signatureTextClass: string;
	initialTextClass: string;
	/** Canvas / SVG raster font size for full signature */
	signatureFontSize: number;
	/** Canvas / SVG raster font size for initials */
	initialFontSize: number;
};

export const SIGNATURE_FONT_CATALOG: SignatureFontCatalogEntry[] = [
	{
		id: "typed",
		label: "Typed",
		cssFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
		legacyIds: [],
		signatureTextClass: "font-mono text-sm",
		initialTextClass: "font-mono text-xs",
		signatureFontSize: 28,
		initialFontSize: 16,
	},
	{
		id: "dancing-script",
		label: "Dancing Script",
		cssFamily: '"Dancing Script", cursive',
		fontsourcePackage: "@fontsource/dancing-script",
		legacyIds: ["homemade-apple"],
		signatureTextClass: "text-2xl",
		initialTextClass: "text-lg",
		signatureFontSize: 44,
		initialFontSize: 26,
	},
	{
		id: "great-vibes",
		label: "Great Vibes",
		cssFamily: '"Great Vibes", cursive',
		fontsourcePackage: "@fontsource/great-vibes",
		legacyIds: ["gloria-hallelujah"],
		signatureTextClass: "text-3xl",
		initialTextClass: "text-xl",
		signatureFontSize: 48,
		initialFontSize: 28,
	},
	{
		id: "caveat",
		label: "Caveat",
		cssFamily: '"Caveat", cursive',
		fontsourcePackage: "@fontsource/caveat",
		legacyIds: ["nothing-you-could-do"],
		signatureTextClass: "text-2xl font-medium",
		initialTextClass: "text-lg font-medium",
		signatureFontSize: 42,
		initialFontSize: 24,
	},
	{
		id: "satisfy",
		label: "Satisfy",
		cssFamily: '"Satisfy", cursive',
		fontsourcePackage: "@fontsource/satisfy",
		legacyIds: ["reenie-beanie"],
		signatureTextClass: "text-2xl",
		initialTextClass: "text-lg",
		signatureFontSize: 40,
		initialFontSize: 24,
	},
	{
		id: "kalam",
		label: "Kalam",
		cssFamily: '"Kalam", cursive',
		fontsourcePackage: "@fontsource/kalam",
		legacyIds: [],
		signatureTextClass: "text-xl font-semibold",
		initialTextClass: "text-base font-semibold",
		signatureFontSize: 36,
		initialFontSize: 22,
	},
	{
		id: "alex-brush",
		label: "Alex Brush",
		cssFamily: '"Alex Brush", cursive',
		fontsourcePackage: "@fontsource/alex-brush",
		legacyIds: ["mr-dafoe"],
		signatureTextClass: "text-3xl",
		initialTextClass: "text-xl",
		signatureFontSize: 46,
		initialFontSize: 28,
	},
];

export const SIGNATURE_FONT_IDS = SIGNATURE_FONT_CATALOG.map(
	(entry) => entry.id,
) as SignatureFontId[];

const catalogById = new Map(
	SIGNATURE_FONT_CATALOG.map((entry) => [entry.id, entry]),
);

function requireTypedCatalogEntry(): SignatureFontCatalogEntry {
	const entry = SIGNATURE_FONT_CATALOG.find(
		(catalogEntry) => catalogEntry.id === DEFAULT_TYPED_SIGNATURE_FONT_ID,
	);
	if (!entry) {
		throw new Error("typed signature font catalog entry missing");
	}
	return entry;
}

const typedCatalogEntry = requireTypedCatalogEntry();

const legacyIdToCanonical = new Map<string, SignatureFontId>(
	SIGNATURE_FONT_CATALOG.flatMap((entry) =>
		entry.legacyIds.map((legacyId) => [legacyId, entry.id]),
	),
);

/** Map stored or UI font ids (including legacy) to a catalog entry. */
export function resolveSignatureFontId(
	fontId: string | null | undefined,
): SignatureFontId {
	if (!fontId) return "typed";
	const legacy = legacyIdToCanonical.get(fontId);
	if (legacy) return legacy;
	if (catalogById.has(fontId as SignatureFontId)) {
		return fontId as SignatureFontId;
	}
	return "typed";
}

export function getSignatureFontCatalogEntry(
	fontId: string | null | undefined,
): SignatureFontCatalogEntry {
	const resolvedId = resolveSignatureFontId(fontId);
	const entry = catalogById.get(resolvedId);
	if (entry) return entry;
	return typedCatalogEntry;
}

export function getSignaturePreviewClassForRole(
	fontId: string | null | undefined,
	role: UserSignatureRole,
): string {
	const entry = getSignatureFontCatalogEntry(fontId);
	const sizeClass =
		role === "initial" ? entry.initialTextClass : entry.signatureTextClass;
	return `text-foreground ${sizeClass}`;
}

export function getSignatureFontRasterSpec(
	fontId: string | null | undefined,
	role: UserSignatureRole,
) {
	const entry = getSignatureFontCatalogEntry(fontId);
	const isInitial = role === "initial";
	return {
		entry,
		cssFamily: entry.cssFamily,
		dimensions: isInitial
			? SIGNATURE_RASTER_DIMENSIONS.initial
			: SIGNATURE_RASTER_DIMENSIONS.signature,
		fontSize: isInitial ? entry.initialFontSize : entry.signatureFontSize,
	};
}

export function deriveSignatureInitials(
	firstName: string,
	lastName: string,
): string {
	const first = firstName.trim();
	const last = lastName.trim();
	if (!first) return "";
	if (last) {
		return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
	}
	return first.charAt(0).toUpperCase();
}

export function buildSignatureFontOptions(args: {
	signatureText: string;
	initialsText: string;
}) {
	return SIGNATURE_FONT_CATALOG.map((entry) => ({
		id: entry.id,
		label: entry.label,
		signature: args.signatureText,
		initials: args.initialsText,
	}));
}

export function signatureFontsourcePackages(): string[] {
	return SIGNATURE_FONT_CATALOG.flatMap((entry) =>
		entry.fontsourcePackage ? [entry.fontsourcePackage] : [],
	);
}

export const SIGNATURE_RASTER_DIMENSIONS = {
	signature: { width: 520, height: 140 },
	initial: { width: 200, height: 80 },
} as const;

export const SIGNATURE_RASTER_INK = "#111827";
