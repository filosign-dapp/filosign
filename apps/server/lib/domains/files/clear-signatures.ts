import { computeCidIdentifier } from "@filosign/contracts";
import { throwAppError } from "@filosign/errors/server";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress, zeroAddress } from "viem";
import z from "zod";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import {
	fsEnvelopeRegistryAt,
	readHasAnyPaidLegForCid,
	readRegistryPaymentValidatorAddress,
	relayClearEnvelopeSignatures,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { assertRecallerMayRelay } from "./recall-auth";
import { wipeEnvelopeSigningProgressForPiece } from "./signer-replacement";

const { files } = db.schema;

export const zClearEnvelopeSignaturesBody = z.object({
	pieceCid: z.string().min(1),
	recaller: zEvmAddress(),
	timestamp: z.number().int().positive(),
	signature: zHexString(),
});

export async function filesClearEnvelopeSignatures(
	wallet: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsed = zClearEnvelopeSignaturesBody.safeParse(rawBody);
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
	const cidId = computeCidIdentifier(pieceCid);

	const validatorAddr = getAddress(
		await readRegistryPaymentValidatorAddress(registry.address),
	);
	if (validatorAddr !== zeroAddress) {
		const hasPaidLeg = await readHasAnyPaidLegForCid(validatorAddr, cidId);
		if (hasPaidLeg) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason:
						"Cannot clear signatures while a payout leg has been paid for this envelope",
				},
			});
		}
	}

	const txRes = await tryCatch(
		relayClearEnvelopeSignatures(registry, [
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
						: "clearEnvelopeSignatures relay failed",
			},
		});
	}

	await db.transaction(async (tx) => {
		await wipeEnvelopeSigningProgressForPiece(tx, pieceCid);
	});

	return {
		txHash: txRes.data,
		clearedBy: getAddress(recaller),
		clearedAt: new Date(timestamp * 1000).toISOString(),
	};
}
