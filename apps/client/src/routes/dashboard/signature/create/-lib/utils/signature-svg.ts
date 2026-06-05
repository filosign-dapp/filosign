import { optimize } from "svgo";
import type { Editor } from "tldraw";

export async function exportSignatureSvgFromEditor(
	editor: Editor,
): Promise<string> {
	const shapes = editor.getCurrentPageShapes();
	if (shapes.length === 0) {
		throw new Error("Please draw something before saving.");
	}

	const shapeIds = shapes.map((shape) => shape.id);
	const exportResult = await editor.toImage(shapeIds, {
		format: "svg",
		scale: 2,
	});
	const rawSvg = await exportResult.blob.text();

	const optimized = optimize(rawSvg, {
		multipass: true,
		js2svg: { pretty: false },
		plugins: [
			{ name: "preset-default" },
			{ name: "removeDimensions" },
			{ name: "cleanupIds" },
		],
	});
	return optimized.data;
}

export function svgToDataUrl(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
