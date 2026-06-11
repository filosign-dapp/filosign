import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

export type PlacementFieldType = SignatureField["type"];

export const PLACEMENT_FIELD_SCALE_MIN = 0.5;
export const PLACEMENT_FIELD_SCALE_MAX = 3;

const FIELD_MIN_HEIGHT: Partial<Record<PlacementFieldType, number>> = {
	text: 28,
	date: 28,
	name: 28,
	email: 28,
	checkbox: 24,
};

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
	checkbox: { width: 24, height: 24, aspectRatio: 1 },
};

const MOBILE_SCALE = 0.85;

export function fieldSupportsFreeformResize(type: PlacementFieldType): boolean {
	return type === "text";
}

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

export function clampFieldHeight(
	type: PlacementFieldType,
	height: number,
	isMobile = false,
): number {
	const defaults = defaultPlacementFieldRect(type, isMobile);
	const minH = defaults.height * PLACEMENT_FIELD_SCALE_MIN;
	const maxH = defaults.height * PLACEMENT_FIELD_SCALE_MAX;
	const scaled = Math.max(minH, Math.min(height, maxH));
	const floor = FIELD_MIN_HEIGHT[type] ?? 0;
	return Math.max(floor, scaled);
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
		height: clampFieldHeight(
			type,
			Math.round(clampedW / aspectRatio),
			isMobile,
		),
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

	if (fieldSupportsFreeformResize(field.type)) {
		const height =
			field.height && field.height > 0
				? clampFieldHeight(field.type, field.height, isMobile)
				: fieldRectFromWidth(field.type, width, isMobile).height;
		return { ...field, width, height };
	}

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
