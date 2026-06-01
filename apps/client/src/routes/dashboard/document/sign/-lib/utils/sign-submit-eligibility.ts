/** When the Sign control may be enabled (fields + PDF ready + access gates). */
export function canEnableSignSubmit(opts: {
	canSubmitPlacementSign: boolean;
	docReady: boolean;
	firstViewedAt: string | null | undefined;
	isSender: boolean;
	serverCanSign: boolean | undefined;
}): boolean {
	if (!opts.canSubmitPlacementSign || !opts.docReady) return false;
	if (opts.serverCanSign === false) return false;
	if (opts.isSender) return true;
	return Boolean(opts.firstViewedAt);
}
