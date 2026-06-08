import {
	defaultPlacementFieldRect,
	type PlacementFieldType,
} from "@/src/lib/domains/files/field-box";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

export type PlacementFieldSize = {
	width: number;
	height: number;
};

/** Envelope-wide last-used size per field type. */
export type PlacementFieldPresetStore = Map<
	PlacementFieldType,
	PlacementFieldSize
>;

export function resolvePlacementFieldSize(args: {
	type: PlacementFieldType;
	isMobile: boolean;
	presets: PlacementFieldPresetStore;
}): PlacementFieldSize {
	const saved = args.presets.get(args.type);
	if (saved) return saved;

	const defaults = defaultPlacementFieldRect(args.type, args.isMobile);
	return { width: defaults.width, height: defaults.height };
}

export function rememberPlacementFieldSize(
	presets: PlacementFieldPresetStore,
	type: PlacementFieldType,
	size: PlacementFieldSize,
): void {
	presets.set(type, size);
}

/** Seed presets from fields already on the envelope (e.g. draft hydrate). */
export function seedPlacementFieldPresetsFromFields(
	presets: PlacementFieldPresetStore,
	fields: SignatureField[],
): void {
	const latestByType = new Map<PlacementFieldType, SignatureField>();
	for (const field of fields) {
		latestByType.set(field.type, field);
	}
	for (const [type, field] of latestByType) {
		if (presets.has(type)) continue;
		rememberPlacementFieldSize(presets, type, {
			width: field.width,
			height: field.height,
		});
	}
}
