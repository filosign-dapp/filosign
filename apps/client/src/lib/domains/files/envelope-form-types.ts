export type Recipient = {
	clientRowId?: string;
	name: string;
	email: string;
	walletAddress?: string;
	role: "signer" | "viewer";
};

export type UploadedFile = {
	id: string;
	file: File;
	name: string;
	size: number;
	type: string;
};

import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";

export type EnvelopeForm = {
	recipients: Recipient[];
	emailSubject: string;
	emailMessage: string;
	documents: UploadedFile[];
	settlementDrafts: SettlementAttachmentDraft[];
};

export const ALLOWED_FILE_TYPES = [
	{ mime: "application/pdf", extensions: [".pdf"] },
] as const;

export type AllowedFileMime = (typeof ALLOWED_FILE_TYPES)[number]["mime"];

export const ACCEPTED_FILE_MIME_SET = new Set<AllowedFileMime>(
	ALLOWED_FILE_TYPES.map((t) => t.mime),
);

export const ACCEPTED_FILE_EXTENSIONS = Array.from(
	new Set(ALLOWED_FILE_TYPES.flatMap((t) => t.extensions)),
);

export type StoredDocument = {
	id: string;
	pieceCid?: string;
	name: string;
	size: number;
	type: string;
	dataUrl?: string;
};

export type CreateForm = {
	recipients: Recipient[];
	emailSubject: string;
	emailMessage: string;
	documents: StoredDocument[];
	settlementDrafts: SettlementAttachmentDraft[];
};
