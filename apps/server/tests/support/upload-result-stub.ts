import type { UploadResult } from "@filoz/synapse-sdk";

type UploadCopyStub = {
	dataSetId: bigint;
	pieceId: bigint;
	role: string;
	providerId?: bigint;
	retrievalUrl?: string;
	isNewDataSet?: boolean;
};

/** Partial Synapse upload result for unit tests (only `copies` need to be realistic). */
export function uploadResultStub(partial: {
	copies: readonly UploadCopyStub[];
	complete?: boolean;
	requestedCopies?: number;
	size?: bigint;
	failedAttempts?: readonly unknown[];
	pieceCid?: { toString: () => string };
}): UploadResult {
	return {
		complete: true,
		pieceCid: { toString: () => "bafkzcibtest" },
		...partial,
	} as unknown as UploadResult;
}
