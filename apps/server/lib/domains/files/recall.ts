import { throwAppError } from "@filosign/errors/server";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import { invalidateNotificationsInbox } from "@/lib/platform/cache/invalidate";
import db from "@/lib/platform/db";
import { fsEnvelopeRegistryAt, relayRecallEnvelope } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { assertRecallerMayRelay } from "./recall-auth";
import { cancelPendingSignerAmendmentsForPiece } from "./signer-replacement";

const { files, fileColdInvites, fileParticipants } = db.schema;

export { assertRecallerMayRelay } from "./recall-auth";

export const zRecallEnvelopeBody = z.object({
	pieceCid: z.string().min(1),
	recaller: zEvmAddress(),
	timestamp: z.number().int().positive(),
	signature: zHexString(),
});

export async function filesRecallEnvelope(
	wallet: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsed = zRecallEnvelopeBody.safeParse(rawBody);
	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}

	const { pieceCid, recaller, timestamp, signature } = parsed.data;

	const [file] = await db
		.select({
			sender: files.sender,
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			completedAt: files.completedAt,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}
	if (file.revokedBeforeCompletedAt) {
		throw throwAppError("FILES.ENVELOPE_VOIDED");
	}
	if (file.completedAt) {
		throw throwAppError("FILES.ENVELOPE_COMPLETE");
	}

	await assertRecallerMayRelay({
		wallet,
		file: {
			sender: file.sender,
			organizationId: file.organizationId,
		},
		recaller,
		activeOrg,
		registryAddress: file.registryAddress,
	});

	const registry = fsEnvelopeRegistryAt(file.registryAddress);
	const txRes = await tryCatch(
		relayRecallEnvelope(registry, [
			pieceCid,
			recaller,
			BigInt(timestamp),
			signature,
		]),
	);
	if (txRes.error) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason:
					txRes.error instanceof Error
						? txRes.error.message
						: "recallEnvelope relay failed",
			},
		});
	}

	const revokedBeforeCompletedAt = new Date(timestamp * 1000);
	const revokedBy = getAddress(recaller);

	await db.transaction(async (tx) => {
		await tx
			.update(files)
			.set({
				revokedBeforeCompletedAt,
				revokedBy,
				revokeOnchainTxHash: txRes.data,
				updatedAt: revokedBeforeCompletedAt,
			})
			.where(eq(files.pieceCid, pieceCid));

		await tx
			.update(fileColdInvites)
			.set({ status: "revoked", updatedAt: revokedBeforeCompletedAt })
			.where(
				and(
					eq(fileColdInvites.filePieceCid, pieceCid),
					eq(fileColdInvites.status, "pending"),
				),
			);

		await cancelPendingSignerAmendmentsForPiece(tx, pieceCid);
	});

	const participants = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(eq(fileParticipants.filePieceCid, pieceCid));
	await Promise.all(
		participants.map((row) => invalidateNotificationsInbox(row.wallet)),
	);

	return {
		txHash: txRes.data,
		revokedBeforeCompletedAt: revokedBeforeCompletedAt.toISOString(),
		revokedBy,
	};
}
