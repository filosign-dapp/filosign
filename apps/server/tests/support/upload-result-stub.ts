import type { UploadResult } from "@filoz/synapse-sdk";

type UploadCopyStub = {
	dataSetId: bigint;
	pieceId: bigint;
	role: string;
};

/** Partial Synapse upload result for unit tests (only `copies` need to be realistic). */
export function uploadResultStub(partial: {
	copies: readonly UploadCopyStub[];
}): UploadResult {
	return partial as unknown as UploadResult;
}
