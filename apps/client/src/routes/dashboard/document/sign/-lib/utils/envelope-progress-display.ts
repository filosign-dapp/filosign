export type EnvelopeProgressLike = {
	routingMode: number;
	requiredSignersCount: number;
	requiredSignaturesCount: number;
	optionalSignersCount: number;
	optionalSignaturesCount: number;
	quorumN: number;
	allRequiredSigned: boolean;
	allSigned: boolean;
	quorumMet: boolean;
	nextSignerEmail: string | null;
};

export function envelopeProgressTotals(progress: EnvelopeProgressLike): {
	signedCount: number;
	totalSigners: number;
} {
	const totalSigners =
		progress.requiredSignersCount + progress.optionalSignersCount;
	const signedCount =
		progress.requiredSignaturesCount + progress.optionalSignaturesCount;
	return { signedCount, totalSigners };
}

export function envelopeProgressPercent(
	signedCount: number,
	totalSigners: number,
): number {
	if (totalSigners <= 0) return 0;
	return Math.min(100, Math.round((signedCount / totalSigners) * 100));
}

export function buildEnvelopeProgressLines(
	progress: EnvelopeProgressLike,
	canSignByRouting?: boolean,
): string[] {
	const {
		routingMode,
		requiredSignaturesCount,
		requiredSignersCount,
		optionalSignaturesCount,
		optionalSignersCount,
		quorumN,
		allRequiredSigned,
		quorumMet,
		nextSignerEmail,
	} = progress;

	const lines: string[] = [];
	const hasOptional = optionalSignersCount > 0;

	if (hasOptional) {
		lines.push(
			`${requiredSignaturesCount} of ${requiredSignersCount} required signers done · ${optionalSignaturesCount} of ${optionalSignersCount} optional signers done.`,
		);
	} else if (requiredSignersCount > 0) {
		const countLine = `${requiredSignaturesCount} of ${requiredSignersCount} signers have signed.`;
		if (routingMode === 1) {
			if (canSignByRouting === false) {
				lines.push(
					`${countLine} You'll sign after everyone ahead of you in the signing order.`,
				);
			} else if (nextSignerEmail) {
				lines.push(`${countLine} ${nextSignerEmail} is next.`);
			} else {
				lines.push(countLine);
			}
		} else {
			lines.push(countLine);
		}
	}

	if (quorumN > 0) {
		lines.push(
			quorumMet
				? `Minimum signatures for this envelope are met (${quorumN} needed).`
				: `Still need ${quorumN} more signature${quorumN === 1 ? "" : "s"} on this envelope.`,
		);
	}

	if (allRequiredSigned && !hasOptional && lines.length === 0) {
		lines.push("Everyone required to sign has signed.");
	}

	return lines;
}
