import { type AckFileDeps, ackFile } from "./ack-file";

export type EnsureAcknowledgedDeps = AckFileDeps;

export async function ensureAcknowledged(
	deps: EnsureAcknowledgedDeps,
	pieceCid: string,
): Promise<void> {
	const detail = await deps.rpcQuery.files.piece.detail.call({ pieceCid });
	if (detail.participantAccess?.acknowledged) {
		return;
	}

	await ackFile(deps, { pieceCid });
}
