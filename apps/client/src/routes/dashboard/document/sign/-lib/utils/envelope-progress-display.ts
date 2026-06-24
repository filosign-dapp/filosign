import type { FileInfo } from "@filosign/react/files";

export type EnvelopeProgressLike = NonNullable<FileInfo["envelopeProgress"]>;

export function isEnvelopeVoided(
	progress: EnvelopeProgressLike | null | undefined,
): boolean {
	return Boolean(progress?.revokedBeforeCompletedAt);
}

export function envelopeProgressTotals(progress: EnvelopeProgressLike): {
	signedCount: number;
	totalSigners: number;
} {
	const signedCount = progress.requiredSignaturesCount;
	const totalSigners =
		progress.quorumN > 0 ? progress.quorumN : progress.requiredSignersCount;
	return { signedCount, totalSigners };
}

export function willSignCompleteEnvelope(
	progress: EnvelopeProgressLike | null | undefined,
): boolean {
	if (!progress || progress.completedAt) {
		return false;
	}
	const nextSignatures = progress.requiredSignaturesCount + 1;
	if (progress.quorumN > 0) {
		return nextSignatures >= progress.quorumN;
	}
	return nextSignatures >= progress.requiredSignersCount;
}

export function envelopeProgressPercent(
	signedCount: number,
	totalSigners: number,
	isComplete?: boolean,
): number {
	if (isComplete) return 100;
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
		if (quorumN > 0 && requiredSignersCount > quorumN) {
			lines.push("Quorum met; remaining signers were not required.");
		}
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

export function signerStatusLabel(args: {
	hasSigned: boolean;
	isReplacementOld: boolean;
	isReplacementNew: boolean;
	invitePending: boolean;
	isUpNext: boolean;
	isSequential: boolean;
	envelopeComplete: boolean;
}): string {
	if (args.hasSigned) return "Signed";
	if (args.envelopeComplete) return "Not required";
	if (args.isReplacementOld) return "Change pending (current)";
	if (args.isReplacementNew) return "Change pending (new)";
	if (args.invitePending) return "Invite pending";
	if (args.isUpNext) return "Up next";
	if (args.isSequential) return "Waiting";
	return "Pending";
}

export function resolveSignHeaderStatus(args: {
	alreadySigned: boolean;
	canSign: boolean;
	hasPlacementFields: boolean;
	canSubmitPlacementSign: boolean;
	envelopeComplete: boolean;
}): { label: string; dotClass: string } | null {
	if (args.alreadySigned) {
		return { label: "Signed", dotClass: "bg-secondary" };
	}
	if (args.envelopeComplete) {
		return { label: "Envelope complete", dotClass: "bg-secondary" };
	}
	if (!args.canSign) {
		return null;
	}
	if (args.hasPlacementFields && !args.canSubmitPlacementSign) {
		return { label: "Fields incomplete", dotClass: "bg-amber-500" };
	}
	return { label: "Ready to sign", dotClass: "bg-secondary" };
}
