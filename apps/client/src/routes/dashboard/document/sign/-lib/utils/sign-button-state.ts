export function shouldShowSignButton(opts: {
	signerAddress: string | undefined;
	alreadySigned: boolean;
	canSign: boolean;
	assignedFieldCount: number;
}): boolean {
	if (!opts.signerAddress || opts.alreadySigned) return false;
	return opts.canSign || opts.assignedFieldCount > 0;
}

export function resolveSignButtonDisabledReason(opts: {
	canSubmitSign: boolean;
	canSign: boolean;
	canSignByRouting?: boolean;
	signerReplacementPending?: boolean;
	canSubmitPlacementSign: boolean;
	docReady: boolean;
	isSender: boolean;
	acknowledged?: boolean;
	firstViewedAt: string | null | undefined;
}): string | null {
	if (opts.canSubmitSign) return null;

	if (opts.signerReplacementPending) {
		return "A signer change is pending. Signing is paused until it is resolved.";
	}

	if (opts.canSignByRouting === false) {
		return "It's not your turn yet. You'll sign after everyone ahead of you in the signing order.";
	}

	if (!opts.docReady) {
		return "The document is still loading.";
	}

	if (!opts.isSender && opts.acknowledged === false) {
		return "Acknowledge the envelope before signing.";
	}

	if (!opts.isSender && !opts.firstViewedAt) {
		return "Review the document before signing.";
	}

	if (!opts.canSign) {
		return "You can't sign this envelope right now.";
	}

	if (!opts.canSubmitPlacementSign) {
		return "Complete every required field before signing.";
	}

	return "Signing isn't available yet.";
}
