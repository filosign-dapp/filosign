import { sha256 } from "viem";
import type { PlacementManifest } from "../utils/placement";
import { normalizePlacementRecipientEmail } from "../utils/placement";
import { WELCOME_PRACTICE_PDF_BYTES } from "./welcome-practice.bytes";

/** Stable document id for the welcome practice PDF. */
export const WELCOME_PRACTICE_DOCUMENT_ID = "welcome-practice-v2";

/** Normalized signature field on the practice poster (measured on add-sign). */
export const WELCOME_PRACTICE_SIGNATURE_RECT = {
	x: 0.44617838541666666,
	y: 0.781967504074092,
	width: 0.4022395833333333,
	height: 0.04004711425206125,
} as const;

/** Normalized date field on the practice poster (measured on add-sign). */
export const WELCOME_PRACTICE_DATE_RECT = {
	x: 0.6176222430151468,
	y: 0.8516180901786147,
	width: 0.23079572573485313,
	height: 0.03769140164899882,
} as const;

export function welcomePracticePdfBytes(): Uint8Array {
	return WELCOME_PRACTICE_PDF_BYTES;
}

export function welcomePracticeDocumentSha256(): `0x${string}` {
	return sha256(WELCOME_PRACTICE_PDF_BYTES);
}

export function buildPracticePlacementManifest(args: {
	userEmail: string;
}): PlacementManifest {
	const email = normalizePlacementRecipientEmail(args.userEmail);
	const documentSha256 = welcomePracticeDocumentSha256();

	return {
		version: 1,
		documents: [
			{
				id: WELCOME_PRACTICE_DOCUMENT_ID,
				name: "Welcome to Filosign",
				sha256Plaintext: documentSha256,
				pageCount: 1,
			},
		],
		fields: [
			{
				id: "practice-signature-1",
				documentId: WELCOME_PRACTICE_DOCUMENT_ID,
				pageIndex: 0,
				type: "signature",
				required: true,
				assignedRecipientEmail: email,
				rect: { ...WELCOME_PRACTICE_SIGNATURE_RECT },
			},
			{
				id: "practice-date-1",
				documentId: WELCOME_PRACTICE_DOCUMENT_ID,
				pageIndex: 0,
				type: "date",
				required: true,
				assignedRecipientEmail: email,
				rect: { ...WELCOME_PRACTICE_DATE_RECT },
			},
		],
	};
}

export const WELCOME_PRACTICE_ENVELOPE_NAME = "Welcome to Filosign";
