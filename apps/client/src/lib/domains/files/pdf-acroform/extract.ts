import {
	PDFCheckBox,
	PDFDocument,
	PDFDropdown,
	type PDFField,
	PDFRadioGroup,
	PDFSignature,
	PDFTextField,
} from "pdf-lib";
import type { PlacementFieldType } from "@/src/lib/domains/files/field-box";
import { PLACEMENT_VIEWPORT_WIDTH } from "@/src/lib/domains/files/placement-viewport";

export type DetectedPdfFormFieldRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type DetectedPdfFormField = {
	pageIndex: number;
	rect: DetectedPdfFormFieldRect;
	pdfFieldName: string;
	suggestedType: PlacementFieldType;
};

function pageIndexForWidget(
	pages: ReturnType<PDFDocument["getPages"]>,
	widget: ReturnType<PDFField["acroField"]["getWidgets"]>[number],
): number {
	const pageRef = widget.P();
	for (let i = 0; i < pages.length; i++) {
		if (pages[i].ref === pageRef) return i;
	}
	return 0;
}

export function pdfWidgetRectToPlacementPx(args: {
	rect: DetectedPdfFormFieldRect;
	pageWidth: number;
	pageHeight: number;
	viewportWidth?: number;
}): DetectedPdfFormFieldRect {
	const viewportWidth = args.viewportWidth ?? PLACEMENT_VIEWPORT_WIDTH;
	const scale = viewportWidth / Math.max(args.pageWidth, 1);
	const topLeftY = args.pageHeight - args.rect.y - args.rect.height;
	return {
		x: args.rect.x * scale,
		y: topLeftY * scale,
		width: args.rect.width * scale,
		height: args.rect.height * scale,
	};
}

function suggestFilosignType(
	fieldName: string,
	field: PDFField,
): PlacementFieldType | null {
	if (field instanceof PDFSignature) {
		return "signature";
	}
	if (field instanceof PDFCheckBox) {
		return "checkbox";
	}
	if (field instanceof PDFRadioGroup) {
		return null;
	}
	if (!(field instanceof PDFTextField)) {
		return null;
	}

	const normalized = fieldName.toLowerCase();
	if (normalized.includes("email")) return "email";
	if (normalized.includes("date")) return "date";
	if (normalized.includes("name")) return "name";
	return "text";
}

export async function extractPdfAcroformFields(
	bytes: Uint8Array,
): Promise<DetectedPdfFormField[]> {
	let doc: PDFDocument;
	try {
		doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
	} catch {
		return [];
	}

	const form = doc.getForm();
	const fields = form.getFields();
	if (fields.length === 0) return [];

	const pages = doc.getPages();
	const detected: DetectedPdfFormField[] = [];

	for (const field of fields) {
		if (field instanceof PDFDropdown) continue;

		const suggestedType = suggestFilosignType(field.getName(), field);
		if (!suggestedType) continue;

		for (const widget of field.acroField.getWidgets()) {
			const pageIndex = pageIndexForWidget(pages, widget);
			const page = pages[pageIndex];
			if (!page) continue;

			const rect = widget.getRectangle();
			const placementRect = pdfWidgetRectToPlacementPx({
				rect: {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height,
				},
				pageWidth: page.getWidth(),
				pageHeight: page.getHeight(),
			});

			if (placementRect.width <= 0 || placementRect.height <= 0) continue;

			detected.push({
				pageIndex,
				rect: placementRect,
				pdfFieldName: field.getName(),
				suggestedType,
			});
		}
	}

	return detected;
}
