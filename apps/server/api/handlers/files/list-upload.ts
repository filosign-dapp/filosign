import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { shouldEnforceSendQuota } from "@/lib/domains/users/activation-quota";

import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export const zUploadStartBody = z.object({
	pieceCid: z.string().min(1),
	isPractice: z.boolean().optional(),
});

async function assertCanStartEnvelopeUpload(
	sender: Address,
	isPractice?: boolean,
): Promise<void> {
	if (!shouldEnforceSendQuota(isPractice)) return;
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(sender),
		null,
	);
	assertEntitlement(entitlementCtx, "documents.sent.monthly");
}

export async function filesUploadStart(
	sender: Address,
	input: z.infer<typeof zUploadStartBody>,
) {
	await assertCanStartEnvelopeUpload(sender, input.isPractice);

	const pieceCid = input.pieceCid.trim();
	if (!pieceCid) {
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["pieceCid"],
					message: "Invalid pieceCid",
				},
			]),
		);
	}
	const { bucket } = await import("@/lib/platform/s3/client");
	const key = `uploads/${pieceCid}`;
	const uploadUrl = bucket.presign(key, {
		method: "PUT",
		expiresIn: 60,
		type: "application/octet-stream",
	});
	return { uploadUrl, key };
}

export async function filesAttachmentUploadStart(
	sender: Address,
	input: { packetCid: string },
) {
	await assertCanStartEnvelopeUpload(sender);

	const packetCid = input.packetCid.trim();
	if (!packetCid) {
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["packetCid"],
					message: "Invalid packetCid",
				},
			]),
		);
	}
	const { bucket } = await import("@/lib/platform/s3/client");
	const key = `uploads/attachments/${packetCid}`;
	const uploadUrl = bucket.presign(key, {
		method: "PUT",
		expiresIn: 60,
		type: "application/octet-stream",
	});
	return { uploadUrl, key };
}
