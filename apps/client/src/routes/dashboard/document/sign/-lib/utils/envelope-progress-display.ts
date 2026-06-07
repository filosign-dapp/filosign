import type { Address } from "viem";

export type EnvelopeProgressLike = {
	routingMode: number;
	requiredSignersCount: number;
	requiredSignaturesCount: number;
	quorumN: number;
	completedAt?: number | null;
	revokedBeforeCompletedAt?: number | null;
	revokedBy?: Address | null;
	nextSignerEmail: string | null;
};

export function envelopeProgressTotals(progress: EnvelopeProgressLike): {
	signedCount: number;
	totalSigners: number;
} {
	const totalSigners = progress.requiredSignersCount;
	const signedCount = progress.requiredSignaturesCount;
	return { signedCount, totalSigners };
}

export function envelopeProgressPercent(
	signedCount: number,
	totalSigners: number,
): number {
	if (totalSigners <= 0) return 0;
	return Math.min(100, Math.round((signedCount / totalSigners) * 100));
}

/** Context lines for the signers card (counts live on the bar and signer rows). */
export function buildEnvelopeProgressContextLines(
	progress: EnvelopeProgressLike,
	canSignByRouting?: boolean,
): string[] {
	const { routingMode, requiredSignersCount, quorumN, nextSignerEmail } =
		progress;

	const lines: string[] = [];
	if (progress.completedAt) {
		lines.push("This envelope is complete on-chain.");
		return lines;
	}

	if (requiredSignersCount > 0 && routingMode === 1) {
		if (canSignByRouting === false) {
			lines.push(
				"You'll sign after everyone ahead of you in the signing order.",
			);
		} else if (nextSignerEmail) {
			lines.push(`${nextSignerEmail} is next.`);
		}
	}

	if (quorumN > 0) {
		lines.push(
			`This envelope completes when ${quorumN} signer${quorumN === 1 ? "" : "s"} from the quorum set have signed.`,
		);
	}

	return lines;
}
