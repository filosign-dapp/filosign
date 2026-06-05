import type { Address } from "viem";

export function userSignatureObjectKey(
	wallet: Address,
	contentSha256: string,
	ext: string,
): string {
	return `signatures/${wallet}/${contentSha256}.${ext}`;
}

export function envelopeFieldSnapshotKey(
	pieceCid: string,
	fieldId: string,
	contentSha256: string,
	ext: string,
): string {
	return `envelope-fields/${pieceCid}/${fieldId}/${contentSha256}.${ext}`;
}
