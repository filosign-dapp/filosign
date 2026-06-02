import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import type { JobOutboxKind } from "@/lib/platform/db/schema/job-outbox";

const zAddress = z.string().transform((v) => getAddress(v as Address));

export const zDocReceivedOutboxPayload = z.object({
	to: z.string().email(),
	senderWallet: zAddress,
	pieceCid: z.string().min(1),
	senderName: z.string().optional(),
});

export const zColdDocInviteOutboxPayload = z.object({
	to: z.string().email(),
	senderWallet: zAddress,
	pieceCid: z.string().min(1),
	inviteToken: z.string().min(16),
	senderName: z.string().optional(),
});

export type DocReceivedOutboxPayload = z.infer<
	typeof zDocReceivedOutboxPayload
>;
export type ColdDocInviteOutboxPayload = z.infer<
	typeof zColdDocInviteOutboxPayload
>;

export function parseOutboxPayload(
	kind: JobOutboxKind,
	payload: Record<string, unknown>,
): DocReceivedOutboxPayload | ColdDocInviteOutboxPayload {
	if (kind === "doc_received") {
		return zDocReceivedOutboxPayload.parse(payload);
	}
	return zColdDocInviteOutboxPayload.parse(payload);
}
