import type { UserSignatureRole } from "@filosign/shared";
import {
	getSignatureFontRasterSpec,
	SIGNATURE_RASTER_INK,
} from "@filosign/shared";

export async function rasterizeTypedSignature(args: {
	text: string;
	fontId: string;
	role: UserSignatureRole;
}): Promise<Uint8Array> {
	const { cssFamily, dimensions, fontSize } = getSignatureFontRasterSpec(
		args.fontId,
		args.role,
	);

	await document.fonts.load(`${fontSize}px ${cssFamily}`);
	await document.fonts.ready;

	const canvas = document.createElement("canvas");
	canvas.width = dimensions.width;
	canvas.height = dimensions.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas is not supported in this browser");
	}

	ctx.clearRect(0, 0, dimensions.width, dimensions.height);
	ctx.fillStyle = SIGNATURE_RASTER_INK;
	ctx.font = `${fontSize}px ${cssFamily}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(args.text, dimensions.width / 2, dimensions.height * 0.55);

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(value) =>
				value
					? resolve(value)
					: reject(new Error("Failed to export signature PNG")),
			"image/png",
		);
	});

	return new Uint8Array(await blob.arrayBuffer());
}
