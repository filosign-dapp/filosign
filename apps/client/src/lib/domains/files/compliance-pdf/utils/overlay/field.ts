import type {
	ComplianceBundle,
	FieldCompletionWireRow,
	PlacementField,
} from "@filosign/shared";
import type { PDFDocument, PDFFont } from "pdf-lib";
import { StandardFonts } from "pdf-lib";
import { signerAccentColor } from "@/src/lib/domains/files/field-box";
import {
	fieldPlacementStatusFromSignerRow,
	signersByNormalizedRecipientEmail,
} from "../placement";
import {
	drawPlacementFieldInnerFill,
	drawRecipientFieldChrome,
} from "./chrome";
import {
	drawCompletionTextOnField,
	drawFieldCompletionVisual,
} from "./completion-text";
import { hexToPdfRgb, innerRectFromField } from "./layout";
import { drawPlaceholderOverlay } from "./placeholder";

type DrawSingleFieldInput = {
	doc: PDFDocument;
	page: ReturnType<PDFDocument["getPage"]>;
	field: PlacementField;
	pageWidth: number;
	pageHeight: number;
	font: PDFFont;
	fontBold: PDFFont;
	signersByRecipient: ReturnType<typeof signersByNormalizedRecipientEmail>;
	completion: FieldCompletionWireRow | undefined;
};

export async function drawSinglePlacementFieldOverlay(
	input: DrawSingleFieldInput,
): Promise<void> {
	const {
		doc,
		page,
		field: f,
		pageWidth: w,
		pageHeight: h,
		font,
		fontBold,
		signersByRecipient,
		completion,
	} = input;

	const rw = f.rect.width * w;
	const rh = f.rect.height * h;
	const x = f.rect.x * w;
	const yTop = f.rect.y * h;
	const yPdf = h - yTop - rh;

	const accent = hexToPdfRgb(signerAccentColor(f.assignedRecipientEmail));
	const inner = innerRectFromField(x, yPdf, rw, rh);

	let drewCompletion = false;
	if (completion) {
		drawRecipientFieldChrome(page, x, yPdf, rw, rh, accent);
		drawPlacementFieldInnerFill(page, inner, rw, rh);

		if (completion.valueKind === "visual") {
			drewCompletion = await drawFieldCompletionVisual(
				doc,
				page,
				inner,
				completion,
			);
		}
		if (!drewCompletion) {
			drewCompletion = drawCompletionTextOnField(page, inner, completion, font);
		}
	}

	if (drewCompletion) return;

	const recipientKey = f.assignedRecipientEmail.trim().toLowerCase();
	const signerRow = signersByRecipient.get(recipientKey);
	const st = fieldPlacementStatusFromSignerRow(signerRow, f.id);

	const displayName = (signerRow?.displayName ?? "").trim() || "Signer";
	const email = (signerRow?.email ?? "").trim() || "-";
	const statusWord =
		st === "signed" ? "Signed" : st === "draft" ? "Draft" : "Pending";
	const footerText = `${f.type} / ${statusWord}${f.required ? " / required" : " / optional"}`;

	drawPlaceholderOverlay({
		page,
		x,
		yPdf,
		rw,
		rh,
		st,
		displayName,
		email,
		footerText,
		font,
		fontBold,
		accent,
	});
}

export async function drawPlacementOverlaysOnDocumentPdf(
	doc: PDFDocument,
	placementManifest: ComplianceBundle["placementManifest"],
	signers: ComplianceBundle["signers"],
	fieldCompletions: FieldCompletionWireRow[] | undefined,
	options?: { documentId?: string },
): Promise<void> {
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const n = doc.getPageCount();
	const signersByRecipient = signersByNormalizedRecipientEmail(signers);
	const completionByFieldId = new Map(
		(fieldCompletions ?? []).map((c) => [c.fieldId, c]),
	);

	const fields = options?.documentId
		? placementManifest.fields.filter(
				(f) => f.documentId === options.documentId,
			)
		: placementManifest.fields;

	for (const f of fields) {
		const pi = f.pageIndex;
		if (pi < 0 || pi >= n) continue;
		const page = doc.getPage(pi);
		await drawSinglePlacementFieldOverlay({
			doc,
			page,
			field: f,
			pageWidth: page.getWidth(),
			pageHeight: page.getHeight(),
			font,
			fontBold,
			signersByRecipient,
			completion: completionByFieldId.get(f.id),
		});
	}
}
