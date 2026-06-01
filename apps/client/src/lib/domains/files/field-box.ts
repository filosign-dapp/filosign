import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

export type PlacementFieldType = SignatureField["type"];

export const PLACEMENT_FIELD_SCALE_MIN = 0.5;
export const PLACEMENT_FIELD_SCALE_MAX = 3;

export type PlacementFieldRect = {
	width: number;
	height: number;
	aspectRatio: number;
};

const DESKTOP_RECTS: Record<PlacementFieldType, PlacementFieldRect> = {
	signature: { width: 200, height: 28, aspectRatio: 200 / 28 },
	initial: { width: 80, height: 28, aspectRatio: 80 / 28 },
	date: { width: 120, height: 28, aspectRatio: 120 / 28 },
	name: { width: 160, height: 28, aspectRatio: 160 / 28 },
	email: { width: 180, height: 28, aspectRatio: 180 / 28 },
	text: { width: 200, height: 28, aspectRatio: 200 / 28 },
	checkbox: { width: 28, height: 28, aspectRatio: 1 },
};

const MOBILE_SCALE = 0.85;

export function defaultPlacementFieldRect(
	type: PlacementFieldType,
	isMobile = false,
): PlacementFieldRect {
	const base = DESKTOP_RECTS[type];
	if (!isMobile) return base;
	return {
		width: Math.round(base.width * MOBILE_SCALE),
		height: Math.round(base.height * MOBILE_SCALE),
		aspectRatio: base.aspectRatio,
	};
}

/** @deprecated Use defaultPlacementFieldRect per type */
export function signatureFieldBoxCssPx(isMobile: boolean): {
	width: number;
	height: number;
} {
	const rect = defaultPlacementFieldRect("signature", isMobile);
	return { width: rect.width, height: rect.height };
}

export function clampFieldWidth(
	type: PlacementFieldType,
	width: number,
	isMobile = false,
): number {
	const defaults = defaultPlacementFieldRect(type, isMobile);
	const minW = defaults.width * PLACEMENT_FIELD_SCALE_MIN;
	const maxW = defaults.width * PLACEMENT_FIELD_SCALE_MAX;
	return Math.max(minW, Math.min(width, maxW));
}

export function fieldRectFromWidth(
	type: PlacementFieldType,
	width: number,
	isMobile = false,
): { width: number; height: number } {
	const clampedW = clampFieldWidth(type, width, isMobile);
	const { aspectRatio } = defaultPlacementFieldRect(type, isMobile);
	return {
		width: clampedW,
		height: Math.round(clampedW / aspectRatio),
	};
}

export function normalizeSignatureFieldDimensions(
	field: SignatureField,
	isMobile = false,
): SignatureField {
	const defaults = defaultPlacementFieldRect(field.type, isMobile);
	const width =
		field.width && field.width > 0
			? clampFieldWidth(field.type, field.width, isMobile)
			: defaults.width;
	const { height } = fieldRectFromWidth(field.type, width, isMobile);
	return { ...field, width, height };
}

export function normalizeSignatureFieldsList(
	fields: SignatureField[],
	isMobile = false,
): SignatureField[] {
	return fields.map((f) => normalizeSignatureFieldDimensions(f, isMobile));
}

/** Stable accent colors per assignee email for overlay borders. */
const SIGNER_COLORS = [
	"#3b82f6",
	"#22c55e",
	"#f97316",
	"#a855f7",
	"#ec4899",
	"#14b8a6",
	"#eab308",
];

export function signerAccentColor(email: string): string {
	let hash = 0;
	for (let i = 0; i < email.length; i++) {
		hash = email.charCodeAt(i) + ((hash << 5) - hash);
	}
	return (
		SIGNER_COLORS[Math.abs(hash) % SIGNER_COLORS.length] ?? SIGNER_COLORS[0]
	);
}
