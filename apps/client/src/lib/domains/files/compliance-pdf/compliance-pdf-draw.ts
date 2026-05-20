import {
	PDFDict,
	type PDFDocument,
	type PDFFont,
	PDFName,
	type PDFPage,
	PDFString,
	rgb,
	StandardFonts,
} from "pdf-lib";
import { A4 } from "./compliance-pdf-constants";
import type { ComplianceGlossaryEntry } from "./compliance-pdf-copy";
import { embedComplianceLogo } from "./compliance-pdf-images";
import {
	buildCompliancePdfSummaryFromBundle,
	COMPLIANCE_PDF_APPENDIX_SECTION_TITLE,
} from "./compliance-pdf-summary";
import { lineHeightAt, wrapLines } from "./compliance-pdf-text";
import type {
	CompliancePdfBundleOptions,
	CompliancePdfLine,
} from "./compliance-pdf-types";

const PDF_BRAND = {
	pageBg: rgb(252 / 255, 253 / 255, 250 / 255),
	foreground: rgb(32 / 255, 34 / 255, 35 / 255),
	muted: rgb(112 / 255, 112 / 255, 113 / 255),
	border: rgb(217 / 255, 218 / 255, 222 / 255),
	accent: rgb(94 / 255, 143 / 255, 58 / 255),
	accentDark: rgb(58 / 255, 76 / 255, 33 / 255),
	link: rgb(18 / 255, 86 / 255, 120 / 255),
} as const;

const PDF_M = {
	margin: 56,
	gap: 20,
	sectionGap: 18,
	sectionGapProse: 26,
	sectionTitleBottomPad: 10,
	blankLineGap: 8,
	blankLineGapProse: 14,
	proseLineMult: 1.52,
	defaultLineMult: 1.38,
	valueX: 200,
	bodySize: 10,
	labelSize: 10,
	/** Main report cover title (Helvetica regular). */
	reportTitleSize: 26,
	sectionTitleSize: 12,
	bottomSafe: 56,
	fieldRowGapAfterRule: 10,
	fieldLabelValueGap: 6,
	/** Header mark; scaled with aspect ratio (smaller than title band). */
	logoHeight: 21,
	logoToWordmarkGap: 10,
	/** Min distance from brand-row bottom to report title baseline. */
	logoRowToTitleGap: 38,
} as const;

type Ctx = {
	doc: PDFDocument;
	page: PDFPage;
	y: number;
	pw: number;
	ph: number;
	fontBody: PDFFont;
	fontSectionTitle: PDFFont;
	fontBrand: PDFFont;
	fontMono: PDFFont;
	fontOblique: PDFFont;
};

/** First line of `detail` that fits `budget` width; remainder for following lines. */
function splitDetailForBudget(
	detail: string,
	budget: number,
	font: PDFFont,
	size: number,
): [string, string] {
	if (budget <= 0) return ["", detail];
	const d = detail.trimStart();
	if (!d) return ["", ""];
	const words = d.split(/\s+/);
	let line = "";
	for (const w of words) {
		const cand = line ? `${line} ${w}` : w;
		if (font.widthOfTextAtSize(cand, size) <= budget) line = cand;
		else break;
	}
	if (line) {
		const rest = d.slice(line.length).trimStart();
		return [line, rest];
	}
	const firstWord = words[0] ?? d;
	const hunks = wrapLines(firstWord, budget, font, size);
	const first = hunks[0] ?? "";
	const restOfWord = firstWord.slice(first.length);
	const rest = [restOfWord, ...words.slice(1)].join(" ").trim();
	return [first, rest];
}

function drawGlossaryEntryLine(
	ctx: Ctx,
	x: number,
	maxW: number,
	entry: ComplianceGlossaryEntry,
	proseMode: boolean,
): void {
	const size = 10;
	const bold = ctx.fontSectionTitle;
	const body = ctx.fontBody;
	const mult = proseMode ? PDF_M.proseLineMult : PDF_M.defaultLineMult;
	const lh = Math.max(
		lineHeightAt(bold, size, mult),
		lineHeightAt(body, size, mult),
	);
	const sep = " — ";
	const fg = PDF_BRAND.foreground;

	const termLines = wrapLines(entry.term, maxW, bold, size);
	const termFirst = termLines[0] ?? "";
	const termFirstW = bold.widthOfTextAtSize(termFirst, size);
	const sepW = body.widthOfTextAtSize(sep, size);
	const inlineOk = termLines.length === 1 && termFirstW + sepW <= maxW;

	if (!inlineOk) {
		for (const tl of termLines) {
			ensureSpace(ctx, lh + 10);
			ctx.page.drawText(tl, {
				x,
				y: ctx.y,
				size,
				font: bold,
				color: fg,
			});
			ctx.y -= lh;
		}
		const wrapped = wrapLines(` — ${entry.detail}`, maxW, body, size);
		for (const wln of wrapped) {
			ensureSpace(ctx, lh + 10);
			ctx.page.drawText(wln, {
				x,
				y: ctx.y,
				size,
				font: body,
				color: fg,
			});
			ctx.y -= lh;
		}
		ctx.y -= proseMode ? 4 : 2;
		return;
	}

	const detailBudget = maxW - termFirstW - sepW;
	const [dFirst, dRem] = splitDetailForBudget(
		entry.detail,
		detailBudget,
		body,
		size,
	);

	if (dFirst === "") {
		ensureSpace(ctx, lh + 10);
		ctx.page.drawText(termFirst, {
			x,
			y: ctx.y,
			size,
			font: bold,
			color: fg,
		});
		ctx.y -= lh;
		const wrapped = wrapLines(` — ${entry.detail}`, maxW, body, size);
		for (const wln of wrapped) {
			ensureSpace(ctx, lh + 10);
			ctx.page.drawText(wln, {
				x,
				y: ctx.y,
				size,
				font: body,
				color: fg,
			});
			ctx.y -= lh;
		}
		ctx.y -= proseMode ? 4 : 2;
		return;
	}

	ensureSpace(ctx, lh + 10);
	let cx = x;
	ctx.page.drawText(termFirst, {
		x: cx,
		y: ctx.y,
		size,
		font: bold,
		color: fg,
	});
	cx += termFirstW;
	ctx.page.drawText(sep, {
		x: cx,
		y: ctx.y,
		size,
		font: body,
		color: fg,
	});
	cx += sepW;
	ctx.page.drawText(dFirst, {
		x: cx,
		y: ctx.y,
		size,
		font: body,
		color: fg,
	});
	ctx.y -= lh;

	if (dRem) {
		for (const dl of wrapLines(dRem, maxW, body, size)) {
			ensureSpace(ctx, lh + 10);
			ctx.page.drawText(dl, {
				x,
				y: ctx.y,
				size,
				font: body,
				color: fg,
			});
			ctx.y -= lh;
		}
	}

	ctx.y -= proseMode ? 4 : 2;
}

function chunkHexLines(hex: string, maxChars: number): string[] {
	const clean = hex.replace(/\s/g, "");
	if (clean.length === 0) return [""];
	const out: string[] = [];
	for (let i = 0; i < clean.length; i += maxChars) {
		out.push(clean.slice(i, i + maxChars));
	}
	return out;
}

function addUriLink(
	page: PDFPage,
	baselineX: number,
	baselineY: number,
	text: string,
	size: number,
	font: PDFFont,
	uri: string,
): void {
	const w = font.widthOfTextAtSize(text, size);
	const h = font.heightAtSize(size);
	const context = page.doc.context;
	const action = PDFDict.withContext(context);
	action.set(PDFName.of("Type"), PDFName.of("Action"));
	action.set(PDFName.of("S"), PDFName.of("URI"));
	action.set(PDFName.of("URI"), PDFString.of(uri));

	const llx = baselineX;
	const lly = baselineY - h * 0.35;
	const urx = baselineX + w;
	const ury = baselineY + h * 0.85;

	const annot = PDFDict.withContext(context);
	annot.set(PDFName.of("Type"), PDFName.of("Annot"));
	annot.set(PDFName.of("Subtype"), PDFName.of("Link"));
	annot.set(PDFName.of("Rect"), context.obj([llx, lly, urx, ury]));
	annot.set(PDFName.of("Border"), context.obj([0, 0, 0]));
	annot.set(PDFName.of("A"), action);

	page.node.addAnnot(context.register(annot));
}

function openContinuationPage(ctx: Ctx): void {
	ctx.page = ctx.doc.addPage([A4.w, A4.h]);
	ctx.page.drawRectangle({
		x: 0,
		y: 0,
		width: A4.w,
		height: A4.h,
		color: PDF_BRAND.pageBg,
	});
	const bandTop = ctx.ph - PDF_M.margin;
	const contSize = 8;
	const contStr = "filosign · compliance record (continued)";
	const contFont = ctx.fontBrand;
	const contLh = lineHeightAt(contFont, contSize);
	const textToLineGap = 6;
	const lineToBodyGap = 12;

	ctx.page.drawText(contStr, {
		x: PDF_M.margin,
		y: bandTop,
		size: contSize,
		font: contFont,
		color: PDF_BRAND.muted,
	});

	const lineY = bandTop - contLh - textToLineGap;
	ctx.page.drawLine({
		start: { x: PDF_M.margin, y: lineY },
		end: { x: ctx.pw - PDF_M.margin, y: lineY },
		thickness: 2,
		color: PDF_BRAND.accent,
	});

	ctx.y = lineY - lineToBodyGap;
}

function ensureSpace(ctx: Ctx, neededBelowBaseline: number): void {
	if (ctx.y - neededBelowBaseline < PDF_M.bottomSafe) {
		openContinuationPage(ctx);
	}
}

function drawWrappedLine(
	ctx: Ctx,
	x: number,
	maxW: number,
	line: CompliancePdfLine,
	defaultSize: number,
	defaultColor = PDF_BRAND.foreground,
	proseMode = false,
): void {
	if (line.pageBreakBefore) {
		openContinuationPage(ctx);
	}
	if (line.glossaryEntry) {
		drawGlossaryEntryLine(ctx, x, maxW, line.glossaryEntry, proseMode);
		return;
	}
	if (line.text === "") {
		ctx.y -= proseMode ? PDF_M.blankLineGapProse : PDF_M.blankLineGap;
		return;
	}

	if (line.display === "hex-dump") {
		const targetFont = ctx.fontMono;
		const size = defaultSize;
		const col = line.linkUri ? PDF_BRAND.link : defaultColor;
		const lh = lineHeightAt(targetFont, size);
		const charW = targetFont.widthOfTextAtSize("0", size);
		const charsPerLine = Math.max(16, Math.floor(maxW / charW));
		const hexLines = chunkHexLines(line.text, charsPerLine);
		for (const ln of hexLines) {
			ensureSpace(ctx, lh + 10);
			ctx.page.drawText(ln, {
				x,
				y: ctx.y,
				size,
				font: targetFont,
				color: col,
			});
			if (line.linkUri) {
				addUriLink(ctx.page, x, ctx.y, ln, size, targetFont, line.linkUri);
			}
			ctx.y -= lh;
		}
		return;
	}

	const r = resolveLineDraw(ctx, line, defaultSize, defaultColor, proseMode);
	const lh = lineHeightAt(r.font, r.size, r.lineMult);
	const lines = wrapLines(line.text, maxW, r.font, r.size);

	for (const ln of lines) {
		ensureSpace(ctx, lh + 10);
		ctx.page.drawText(ln, {
			x,
			y: ctx.y,
			size: r.size,
			font: r.font,
			color: r.color,
		});
		if (line.linkUri) {
			addUriLink(ctx.page, x, ctx.y, ln, r.size, r.font, line.linkUri);
		}
		ctx.y -= lh;
	}
	ctx.y -= r.tailGap;
}

function resolveLineDraw(
	ctx: Ctx,
	line: CompliancePdfLine,
	defaultSize: number,
	defaultColor: ReturnType<typeof rgb>,
	proseMode: boolean,
): {
	font: PDFFont;
	size: number;
	lineMult: number;
	color: ReturnType<typeof rgb>;
	tailGap: number;
} {
	const style = line.textStyle ?? "body";
	const prose = proseMode;
	const linkCol = line.linkUri ? PDF_BRAND.link : defaultColor;

	if (style === "subheading") {
		return {
			font: ctx.fontSectionTitle,
			size: 12,
			lineMult: 1.42,
			color: PDF_BRAND.accentDark,
			tailGap: prose ? 8 : 6,
		};
	}
	if (style === "lead") {
		return {
			font: ctx.fontBody,
			size: 10.5,
			lineMult: prose ? PDF_M.proseLineMult : PDF_M.defaultLineMult,
			color: linkCol,
			tailGap: prose ? 6 : 4,
		};
	}
	if (style === "listHeading") {
		return {
			font: ctx.fontSectionTitle,
			size: 10.5,
			lineMult: 1.45,
			color: PDF_BRAND.foreground,
			tailGap: prose ? 8 : 5,
		};
	}
	if (style === "emphasis") {
		return {
			font: ctx.fontOblique,
			size: 10,
			lineMult: prose ? 1.5 : PDF_M.defaultLineMult,
			color: linkCol,
			tailGap: prose ? 5 : 3,
		};
	}
	if (style === "smallMuted") {
		return {
			font: ctx.fontBody,
			size: 8.5,
			lineMult: 1.42,
			color: PDF_BRAND.muted,
			tailGap: 4,
		};
	}

	return {
		font: ctx.fontBody,
		size: defaultSize,
		lineMult: prose ? PDF_M.proseLineMult : PDF_M.defaultLineMult,
		color: linkCol,
		tailGap: prose ? 4 : 0,
	};
}
function drawPdfFooters(
	doc: PDFDocument,
	font: PDFFont,
	color: ReturnType<typeof rgb>,
): void {
	const pages = doc.getPages();
	const n = pages.length;
	const size = 7;
	for (let i = 0; i < n; i++) {
		const page = pages[i];
		const pw = page.getWidth();
		const text = `Filosign compliance record · Page ${i + 1} of ${n}`;
		const tw = font.widthOfTextAtSize(text, size);
		page.drawText(text, {
			x: (pw - tw) / 2,
			y: 32,
			size,
			font,
			color,
		});
	}
}

export async function drawComplianceReport(
	doc: PDFDocument,
	options: CompliancePdfBundleOptions,
): Promise<void> {
	const summary = buildCompliancePdfSummaryFromBundle(options);
	const helvetica = await doc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
	const courier = await doc.embedFont(StandardFonts.Courier);

	/** pdf-lib built-ins only (reliable for hex, ASCII, and typical UTF-8 in exports). */
	const embedded = {
		body: helvetica,
		sectionTitle: helveticaBold,
		brand: helvetica,
		mono: courier,
		oblique: helveticaOblique,
	};

	doc.setTitle("Filosign Compliance Record");
	doc.setSubject(`Export ${options.exportId}`);
	doc.setCreator("Filosign");

	const firstPage = doc.addPage([A4.w, A4.h]);
	firstPage.drawRectangle({
		x: 0,
		y: 0,
		width: A4.w,
		height: A4.h,
		color: PDF_BRAND.pageBg,
	});

	const logoImg = await embedComplianceLogo(doc);

	const ctx: Ctx = {
		doc,
		page: firstPage,
		y: A4.h - PDF_M.margin,
		pw: firstPage.getWidth(),
		ph: firstPage.getHeight(),
		fontBody: embedded.body,
		fontSectionTitle: embedded.sectionTitle,
		fontBrand: embedded.brand,
		fontMono: embedded.mono,
		fontOblique: embedded.oblique,
	};

	const marginTopY = ctx.ph - PDF_M.margin;
	ctx.y = marginTopY;

	const logoH = PDF_M.logoHeight;
	const wordmarkSize = 16;
	const titleSize = PDF_M.reportTitleSize;
	const titleFont = ctx.fontBody;
	const wordmarkFont = ctx.fontSectionTitle;
	/** Space between lowest brand-row ink and top of report title caps (PDF y-up). */
	const titleClearBelowBrandInk = 5;

	let headerBandBottom: number;

	if (logoImg) {
		const sc = logoH / logoImg.height;
		const lw = logoImg.width * sc;
		const logoBottomY = ctx.y - logoH;
		ctx.page.drawImage(logoImg, {
			x: PDF_M.margin,
			y: logoBottomY,
			width: lw,
			height: logoH,
		});
		const rowMidY = logoBottomY + logoH / 2;
		const wmLineH = wordmarkFont.heightAtSize(wordmarkSize);
		// Uppercase wordmark: optically center on the logo mark
		const wmBaseline = rowMidY - wmLineH * 0.42;
		ctx.page.drawText("FILOSIGN", {
			x: PDF_M.margin + lw + PDF_M.logoToWordmarkGap,
			y: wmBaseline,
			size: wordmarkSize,
			font: wordmarkFont,
			color: PDF_BRAND.accentDark,
		});
		const wordmarkInkBottom = wmBaseline - wmLineH * 0.08;
		headerBandBottom = Math.min(logoBottomY, wordmarkInkBottom);
	} else {
		const wmLineH = wordmarkFont.heightAtSize(wordmarkSize);
		const wmBaseline = ctx.y - wmLineH * 0.22;
		ctx.page.drawText("FILOSIGN", {
			x: PDF_M.margin,
			y: wmBaseline,
			size: wordmarkSize,
			font: wordmarkFont,
			color: PDF_BRAND.accentDark,
		});
		headerBandBottom = wmBaseline - wmLineH * 0.08;
	}

	const titleAscentApprox = titleFont.heightAtSize(titleSize) * 0.76;
	const dropToTitleBaseline = Math.max(
		PDF_M.logoRowToTitleGap,
		titleClearBelowBrandInk + titleAscentApprox,
	);
	ctx.y = headerBandBottom - dropToTitleBaseline;

	ctx.page.drawText("Filosign Compliance Record", {
		x: PDF_M.margin,
		y: ctx.y,
		size: titleSize,
		font: titleFont,
		color: PDF_BRAND.foreground,
	});
	// Tight leading to subtitle (not full body line-height — keeps meta line close to title)
	ctx.y -= titleFont.heightAtSize(titleSize) * 0.92 + 2;

	const subParts = [
		options.chainName,
		`chain id ${options.bundle.chainId}`,
		`exported ${options.bundle.exportedAtIso}`,
	];
	ctx.page.drawText(subParts.join(" · "), {
		x: PDF_M.margin,
		y: ctx.y,
		size: 9,
		font: ctx.fontBody,
		color: PDF_BRAND.muted,
	});
	ctx.y -= lineHeightAt(ctx.fontBody, 9) + 10;

	if (summary.explorerBaseUrl) {
		const subText = `Block explorer: ${summary.explorerBaseUrl}`;
		ctx.page.drawText(subText, {
			x: PDF_M.margin,
			y: ctx.y,
			size: 9,
			font: ctx.fontBody,
			color: PDF_BRAND.link,
		});
		addUriLink(
			ctx.page,
			PDF_M.margin,
			ctx.y,
			subText,
			9,
			ctx.fontBody,
			summary.explorerBaseUrl,
		);
		ctx.y -= lineHeightAt(ctx.fontBody, 9) + 8;
	}

	ctx.page.drawLine({
		start: { x: PDF_M.margin, y: ctx.y },
		end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
		thickness: 2.5,
		color: PDF_BRAND.accent,
	});
	ctx.y -= PDF_M.gap + 6;

	ctx.page.drawText("Key identifiers and anchors", {
		x: PDF_M.margin,
		y: ctx.y,
		size: PDF_M.sectionTitleSize + 1,
		font: ctx.fontSectionTitle,
		color: PDF_BRAND.accentDark,
	});
	ctx.y -=
		lineHeightAt(ctx.fontSectionTitle, PDF_M.sectionTitleSize + 1) +
		PDF_M.sectionTitleBottomPad;

	const valueMaxW = ctx.pw - PDF_M.valueX - PDF_M.margin;

	for (const row of summary.fields) {
		const vLines = wrapLines(
			row.value,
			valueMaxW,
			ctx.fontBody,
			PDF_M.bodySize,
		);
		const bodyLh = lineHeightAt(ctx.fontBody, PDF_M.bodySize);
		const labelLh = lineHeightAt(ctx.fontSectionTitle, PDF_M.labelSize);
		const valueTotalH = vLines.length * bodyLh;
		const rowH = Math.max(labelLh, valueTotalH);
		const blockPad = PDF_M.fieldLabelValueGap;

		ensureSpace(ctx, rowH + blockPad + PDF_M.fieldRowGapAfterRule + 8);

		// Bottom-align label and value block within the row (baseline of last value line)
		const bottomBaseline = ctx.y - rowH + bodyLh;

		ctx.page.drawText(row.label, {
			x: PDF_M.margin,
			y: bottomBaseline,
			size: PDF_M.labelSize,
			font: ctx.fontSectionTitle,
			color: PDF_BRAND.muted,
		});

		let vy = bottomBaseline + (vLines.length - 1) * bodyLh;
		for (const vl of vLines) {
			const vc = row.linkUri ? PDF_BRAND.link : PDF_BRAND.foreground;
			ctx.page.drawText(vl, {
				x: PDF_M.valueX,
				y: vy,
				size: PDF_M.bodySize,
				font: ctx.fontBody,
				color: vc,
			});
			if (row.linkUri) {
				addUriLink(
					ctx.page,
					PDF_M.valueX,
					vy,
					vl,
					PDF_M.bodySize,
					ctx.fontBody,
					row.linkUri,
				);
			}
			vy -= bodyLh;
		}

		ctx.y -= rowH + blockPad;

		ctx.page.drawLine({
			start: { x: PDF_M.margin, y: ctx.y },
			end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
			thickness: 0.5,
			color: PDF_BRAND.border,
		});
		ctx.y -= PDF_M.fieldRowGapAfterRule;
	}

	ctx.y -= PDF_M.sectionGap;

	const bodyMaxW = ctx.pw - PDF_M.margin * 2;

	const proseSectionTitles = new Set([
		"About this record",
		COMPLIANCE_PDF_APPENDIX_SECTION_TITLE,
	]);

	for (const section of summary.sections) {
		// Appendix always begins after a page break unless we already sit just under the top margin
		// (avoids an empty page when the prior section ended on a fresh continuation page).
		if (
			section.title === COMPLIANCE_PDF_APPENDIX_SECTION_TITLE &&
			ctx.y < ctx.ph - PDF_M.margin - 40
		) {
			openContinuationPage(ctx);
		}
		const proseMode = proseSectionTitles.has(section.title);
		const sectionTitleH = lineHeightAt(
			ctx.fontSectionTitle,
			PDF_M.sectionTitleSize + 1,
		);
		ensureSpace(ctx, sectionTitleH + PDF_M.sectionTitleBottomPad + 16);

		ctx.page.drawText(section.title, {
			x: PDF_M.margin,
			y: ctx.y,
			size: PDF_M.sectionTitleSize + 1,
			font: ctx.fontSectionTitle,
			color: PDF_BRAND.accentDark,
		});
		ctx.y -= sectionTitleH + 4;
		ctx.page.drawLine({
			start: { x: PDF_M.margin, y: ctx.y },
			end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
			thickness: 1,
			color: PDF_BRAND.accent,
		});
		ctx.y -= PDF_M.sectionTitleBottomPad + 4;

		for (const line of section.lines) {
			drawWrappedLine(
				ctx,
				PDF_M.margin,
				bodyMaxW,
				line,
				PDF_M.bodySize,
				PDF_BRAND.foreground,
				proseMode,
			);
		}
		ctx.y -= proseMode ? PDF_M.sectionGapProse : PDF_M.sectionGap;
	}

	drawPdfFooters(doc, ctx.fontBody, PDF_BRAND.muted);
}
