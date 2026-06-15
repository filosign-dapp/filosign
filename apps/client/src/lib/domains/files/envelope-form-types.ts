export type Recipient = {
	clientRowId?: string;
	name: string;
	email: string;
	walletAddress?: string;
	role: "signer" | "viewer";
	/** When false on a signer, they are optional for registry quorum (Teams Pro). */
	signerRequired?: boolean;
	/** Set when added via compose "I also need to sign" toggle (removed when toggle off). */
	isAutoAddedSelf?: boolean;
};

export type UploadedFile = {
	id: string;
	file: File;
	/** Display name (original upload filename). */
	name: string;
	size: number;
	/** Canonical signable bytes MIME (application/pdf after normalize). */
	type: string;
	/** MIME before PDF normalization (e.g. image/png). */
	sourceMimeType?: string;
	pageCount?: number;
};

import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements/attachment-draft";

export type EnvelopeForm = {
	recipients: Recipient[];
	emailSubject: string;
	emailMessage: string;
	documents: UploadedFile[];
	settlementDrafts: SettlementAttachmentDraft[];
};

export const ALLOWED_FILE_TYPES = [
	{ mime: "application/pdf", extensions: [".pdf"] },
	{ mime: "image/png", extensions: [".png"] },
	{ mime: "image/jpeg", extensions: [".jpg", ".jpeg"] },
	{ mime: "image/webp", extensions: [".webp"] },
	{ mime: "image/gif", extensions: [".gif"] },
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
	sourceMimeType?: string;
	pageCount?: number;
	plaintextSha256?: `0x${string}`;
};

export type SignatureField = {
	id: string;
	type:
		| "signature"
		| "initial"
		| "date"
		| "name"
		| "email"
		| "text"
		| "checkbox";
	x: number;
	y: number;
	width: number;
	height: number;
	page: number;
	documentId: string;
	assignedSignerWallet: string;
	assignedSignerName: string;
	assignedSignerEmail: string;
	required: boolean;
	label?: string;
};

import type { RegisterRoutingInput } from "@filosign/shared";

export type CreateForm = {
	/** Local IndexedDB scope for document bytes (compose buffer). */
	draftId: string;
	/** Server draft UUID; mirrors `?serverDraftId=` when URL-synced. */
	serverDraftId?: string;
	serverDraftRevision?: number;
	/** Baseline for dirty detection after last successful server save. */
	lastSavedSnapshotDigest?: string;
	recipientFingerprint: string;
	recipients: Recipient[];
	emailSubject: string;
	emailMessage: string;
	documents: StoredDocument[];
	settlementDrafts: SettlementAttachmentDraft[];
	signatureFields: SignatureField[];
	/** Teams Pro: sequential routing and quorum (no optional signers on-chain). */
	registerRouting?: RegisterRoutingInput;
	/** Teams+: encrypted supplementary file packets sent with the envelope. */
	attachmentPacketDrafts?: AttachmentPacketComposeDraft[];
};
