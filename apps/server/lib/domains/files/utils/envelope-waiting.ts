import type { EnvelopeRegistryProgress } from "./piece-helpers";

export function waitingForMoreSigners(
	progress: EnvelopeRegistryProgress | null,
): boolean {
	if (!progress || progress.completedAt != null) {
		return false;
	}
	if (progress.quorumN > 0) {
		return progress.requiredSignaturesCount < progress.quorumN;
	}
	return progress.requiredSignaturesCount < progress.requiredSignersCount;
}
