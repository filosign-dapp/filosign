import type { AttachmentPacketDraft } from "@filosign/react/files";
import type { SettlementReleaseType } from "@filosign/shared";
import { settlementReleaseTypeLabel } from "@filosign/shared";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import { buildReleaseParamsFromDraft } from "@/src/lib/domains/settlements/build-release-params";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";

/** File row in compose UI; `bytes` in memory, `size` only when persisted to localStorage. */
export type AttachmentPacketComposeFile = {
	id: string;
	name: string;
	mimeType: string;
	bytes?: Uint8Array;
	size?: number;
};

/** UI-editable supplementary packet stored on the compose draft. */
export type AttachmentPacketComposeDraft = {
	packetId: string;
	label?: string;
	releaseMode: "review" | "conditional";
	releaseType: SettlementReleaseType;
	specificSignerEmail?: string;
	thresholdN?: number;
	recipientEmails: string[];
	files: AttachmentPacketComposeFile[];
};

function releaseParamsFromComposeDraft(
	draft: AttachmentPacketComposeDraft,
	recipients: Recipient[],
): AttachmentPacketDraft["releaseParams"] {
	const settlementShape: SettlementAttachmentDraft = {
		id: draft.packetId,
		recipientClientRowId: "",
		recipientEmail: "",
		recipientSource: "signer",
		recipientLabel: "",
		amountUsdc: "0",
		releaseType: draft.releaseType,
		specificSignerEmail: draft.specificSignerEmail,
		thresholdN: draft.thresholdN,
	};
	return buildReleaseParamsFromDraft(settlementShape, recipients);
}

export function toAttachmentPacketDraft(
	draft: AttachmentPacketComposeDraft,
	recipients: Recipient[],
): AttachmentPacketDraft {
	const conditional = draft.releaseMode === "conditional";
	return {
		packetId: draft.packetId,
		label: draft.label?.trim() || undefined,
		releaseMode: draft.releaseMode,
		releaseType: conditional ? draft.releaseType : undefined,
		releaseParams: conditional
			? releaseParamsFromComposeDraft(draft, recipients)
			: undefined,
		recipientEmails: draft.recipientEmails,
		files: draft.files
			.filter(
				(file): file is AttachmentPacketComposeFile & { bytes: Uint8Array } =>
					file.bytes instanceof Uint8Array && file.bytes.byteLength > 0,
			)
			.map((file) => ({
				id: file.id,
				name: file.name,
				mimeType: file.mimeType,
				bytes: file.bytes,
			})),
	};
}

export function toAttachmentPacketDraftsForSend(
	drafts: AttachmentPacketComposeDraft[],
	recipients: Recipient[],
): AttachmentPacketDraft[] {
	return drafts.map((draft) => toAttachmentPacketDraft(draft, recipients));
}

export function attachmentPacketSummaryLabel(
	draft: AttachmentPacketComposeDraft,
	reviewLabel = "Available after send",
): string {
	if (draft.releaseMode === "review") {
		return reviewLabel;
	}
	return settlementReleaseTypeLabel(draft.releaseType);
}
