import type { PDFFont } from "pdf-lib";
import { lineHeightAt, wrapLines } from "../text";

export type OverlayTextSeg = { text: string; font: PDFFont; size: number };

export function overlaySegTotalHeight(segments: OverlayTextSeg[]): number {
	return segments.reduce((acc, s) => acc + lineHeightAt(s.font, s.size), 0);
}

type BuildOverlaySegmentsInput = {
	displayName: string;
	email: string;
	footerText: string;
	innerW: number;
	font: PDFFont;
	fontBold: PDFFont;
	nameSize: number;
};

export function buildOverlaySegments(
	input: BuildOverlaySegmentsInput,
): OverlayTextSeg[] {
	const { displayName, email, footerText, innerW, font, fontBold, nameSize } =
		input;
	const detailSize = nameSize * 0.9;
	const tagSize = detailSize * 0.95;
	const parts: OverlayTextSeg[] = [];
	for (const t of wrapLines(displayName, innerW, fontBold, nameSize)) {
		parts.push({ text: t, font: fontBold, size: nameSize });
	}
	for (const t of wrapLines(email, innerW, font, detailSize)) {
		parts.push({ text: t, font, size: detailSize });
	}
	for (const t of wrapLines(footerText, innerW, font, tagSize)) {
		parts.push({ text: t, font, size: tagSize });
	}
	return parts;
}

export function fitOverlaySegmentsToHeight(
	segments: OverlayTextSeg[],
	cap: number,
	nameSize: number,
	rebuild: (nextNameSize: number) => OverlayTextSeg[],
): OverlayTextSeg[] {
	let nextNameSize = nameSize;
	let fitted = segments;
	while (overlaySegTotalHeight(fitted) > cap && nextNameSize > 5.5) {
		nextNameSize -= 0.5;
		fitted = rebuild(nextNameSize);
	}

	if (overlaySegTotalHeight(fitted) > cap) {
		const kept: OverlayTextSeg[] = [];
		let used = 0;
		for (const s of fitted) {
			const step = lineHeightAt(s.font, s.size);
			if (used + step > cap) break;
			kept.push(s);
			used += step;
		}
		if (kept.length > 0) {
			const last = kept[kept.length - 1];
			const t = last.text;
			kept[kept.length - 1] = {
				...last,
				text:
					t.length > 8
						? `${t.slice(0, Math.max(1, t.length - 4))}...`
						: `${t}...`,
			};
		}
		fitted = kept;
	}

	return fitted;
}
