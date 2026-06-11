import {
	SIGNATURE_RASTER_DIMENSIONS,
	type UserSignatureRole,
} from "@filosign/shared";
import { optimize } from "svgo";
import type { Editor } from "tldraw";

/** tldraw export scale; bbox is multiplied by this before SVG raster dimensions. */
export const DRAWN_SIGNATURE_EXPORT_SCALE = 4;

/** Padding around drawn strokes so exports are not clipped at the edges. */
export const DRAWN_SIGNATURE_EXPORT_PADDING = 24;

export async function exportSignatureSvgFromEditor(
	editor: Editor,
	role: UserSignatureRole,
): Promise<string> {
	const shapes = editor.getCurrentPageShapes();
	if (shapes.length === 0) {
		throw new Error("Please draw something before saving.");
	}

	const shapeIds = shapes.map((shape) => shape.id);
	const exportResult = await editor.toImage(shapeIds, {
		format: "svg",
		scale: DRAWN_SIGNATURE_EXPORT_SCALE,
		padding: DRAWN_SIGNATURE_EXPORT_PADDING,
	});
	const rawSvg = await exportResult.blob.text();

	const optimized = optimize(rawSvg, {
		multipass: true,
		js2svg: { pretty: false },
		plugins: [{ name: "preset-default" }, { name: "cleanupIds" }],
	});

	return normalizeDrawnSignatureSvg(optimized.data, role, {
		exportedWidth: exportResult.width,
		exportedHeight: exportResult.height,
	});
}

export function normalizeDrawnSignatureSvg(
	svg: string,
	role: UserSignatureRole,
	exported?: { exportedWidth: number; exportedHeight: number },
): string {
	const target =
		role === "initial"
			? SIGNATURE_RASTER_DIMENSIONS.initial
			: SIGNATURE_RASTER_DIMENSIONS.signature;

	const viewBoxMatch = svg.match(/<svg\b[^>]*\bviewBox=["']([^"']+)["']/i);
	const widthMatch = svg.match(/<svg\b[^>]*\bwidth=["']([^"']+)["']/i);
	const heightMatch = svg.match(/<svg\b[^>]*\bheight=["']([^"']+)["']/i);

	let viewBox = viewBoxMatch?.[1];
	if (!viewBox && exported) {
		viewBox = `0 0 ${exported.exportedWidth} ${exported.exportedHeight}`;
	}
	if (!viewBox && widthMatch && heightMatch) {
		const width = Number.parseFloat(widthMatch[1]);
		const height = Number.parseFloat(heightMatch[1]);
		if (Number.isFinite(width) && Number.isFinite(height)) {
			viewBox = `0 0 ${width} ${height}`;
		}
	}
	if (!viewBox) {
		viewBox = `0 0 ${target.width} ${target.height}`;
	}

	return svg.replace(/<svg\b[^>]*>/i, (openTag) => {
		const withoutSizing = openTag
			.replace(/\swidth=["'][^"']*["']/i, "")
			.replace(/\sheight=["'][^"']*["']/i, "")
			.replace(/\sviewBox=["'][^"']*["']/i, "");

		return `${withoutSizing.slice(0, -1)} width="${target.width}" height="${target.height}" viewBox="${viewBox}">`;
	});
}

export function svgToDataUrl(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
