import type {
	UserSignatureArtifact,
	UserSignatureRole,
} from "./signature-artifact";
import {
	getSignatureFontRasterSpec,
	resolveSignatureFontId,
	SIGNATURE_RASTER_DIMENSIONS,
	SIGNATURE_RASTER_INK,
} from "./signature-font-catalog";

function escapeXmlAttr(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/** Legacy SVG repair path; new typed saves use PNG rasterization in the client. */
export function renderTypedSignatureSvg(args: {
	text: string;
	fontId: string;
	width?: number;
	height?: number;
	fill?: string;
}): string {
	const height = args.height ?? SIGNATURE_RASTER_DIMENSIONS.signature.height;
	const role: UserSignatureRole =
		height <= SIGNATURE_RASTER_DIMENSIONS.initial.height
			? "initial"
			: "signature";
	const { cssFamily, dimensions, fontSize } = getSignatureFontRasterSpec(
		args.fontId,
		role,
	);
	const width = args.width ?? dimensions.width;
	const fill = args.fill ?? SIGNATURE_RASTER_INK;

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
    font-family="${escapeXmlAttr(cssFamily)}" font-size="${fontSize}" fill="${fill}">${escapeXmlAttr(args.text)}</text>
</svg>`;
}

export function typedSignatureArtifactPreviewSrc(args: {
	artifact: Pick<
		UserSignatureArtifact,
		"kind" | "role" | "typedMeta" | "previewUrl"
	>;
}): string | null {
	const { artifact } = args;
	if (artifact.kind !== "typed" || !artifact.typedMeta) {
		return artifact.previewUrl;
	}

	// Typed saves are rasterized PNGs in storage; presigned URLs are authoritative.
	if (artifact.previewUrl) {
		return artifact.previewUrl;
	}

	const { dimensions } = getSignatureFontRasterSpec(
		artifact.typedMeta.fontId,
		artifact.role,
	);
	const svg = renderTypedSignatureSvg({
		text: artifact.typedMeta.text,
		fontId: resolveSignatureFontId(artifact.typedMeta.fontId),
		width: dimensions.width,
		height: dimensions.height,
	});
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
