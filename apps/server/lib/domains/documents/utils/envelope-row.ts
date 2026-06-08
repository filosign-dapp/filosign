import { zEnvelopeMetadata } from "@filosign/shared";
import type { Address } from "viem";
import { getAddress } from "viem";
import type { z } from "zod";
import type { zDocumentEnvelopeRowSchema } from "@/api/orpc/schemas/documents-output";
import { resolvePartyLabel, type SenderProfileFields } from "./party-label";

export type DocumentEnvelopeRow = z.infer<typeof zDocumentEnvelopeRowSchema>;

export function parseEnvelopeMetadata(value: unknown) {
	if (!value || typeof value !== "object") return null;
	const parsed = zEnvelopeMetadata.safeParse(value);
	return parsed.success ? parsed.data : null;
}

export function resolveEnvelopeLifecycle(args: {
	completedAt: Date | null;
	revokedBeforeCompletedAt: Date | null;
}): DocumentEnvelopeRow["lifecycle"] {
	if (args.revokedBeforeCompletedAt) return "voided";
	if (args.completedAt) return "completed";
	return "active";
}

function resolveSigning(args: {
	signerSlotCount: number | null | undefined;
	signedCount: number | null | undefined;
}): DocumentEnvelopeRow["signing"] {
	const required = args.signerSlotCount ?? 0;
	if (required <= 0) return undefined;
	return {
		requiredCount: required,
		signedCount: Math.max(0, args.signedCount ?? 0),
	};
}

export function mapEnvelopeListRow(args: {
	pieceCid: string;
	displayName: string | null;
	sender: Address;
	wallet: Address;
	completedAt: Date | null;
	revokedBeforeCompletedAt: Date | null;
	updatedAt: Date;
	ciphertextByteLength: number | null;
	signedByMe: boolean;
	metadataJson: unknown;
	signerSlotCount?: number | null;
	signedCount?: number | null;
	senderProfile?: SenderProfileFields | null;
}): DocumentEnvelopeRow {
	const walletNorm = getAddress(args.wallet).toLowerCase();
	const senderNorm = getAddress(args.sender).toLowerCase();
	const direction =
		senderNorm === walletNorm ? ("sent" as const) : ("received" as const);

	const row: DocumentEnvelopeRow = {
		kind: "envelope",
		id: args.pieceCid,
		title: args.displayName?.trim() || "Untitled Document",
		direction,
		lifecycle: resolveEnvelopeLifecycle(args),
		updatedAt: args.updatedAt,
		sizeBytes: args.ciphertextByteLength,
		signedByMe: args.signedByMe,
		metadata: parseEnvelopeMetadata(args.metadataJson),
		signing: resolveSigning({
			signerSlotCount: args.signerSlotCount,
			signedCount: args.signedCount,
		}),
	};

	if (direction === "received") {
		row.party = {
			wallet: getAddress(args.sender),
			label: resolvePartyLabel(args.senderProfile, args.sender),
		};
	}

	return row;
}
