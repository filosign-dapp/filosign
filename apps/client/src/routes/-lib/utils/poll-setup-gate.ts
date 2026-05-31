const SETUP_GATE_POLL_ATTEMPTS = 5;
const SETUP_GATE_POLL_BASE_MS = 1000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

type PreviewGateArgs = {
	platformInvite?: string;
	setup?: string;
	coldInvite?: string;
	coldPieceCid?: string;
	email?: string;
};

function isAwaitingPaidSetupWebhook(preview: {
	valid: boolean;
	reason?: string;
}): boolean {
	return !preview.valid && preview.reason === "Setup link not found or expired";
}

/** Poll previewGate after Dodo redirect while webhook may still be in flight. */
export async function previewGateWithSetupPolling<T extends { valid: boolean }>(
	previewGate: (args: PreviewGateArgs) => Promise<T>,
	args: PreviewGateArgs,
	options?: {
		attempts?: number;
		baseDelayMs?: number;
	},
): Promise<T> {
	const setup = args.setup?.trim();
	if (!setup) {
		return previewGate(args);
	}

	const attempts = options?.attempts ?? SETUP_GATE_POLL_ATTEMPTS;
	const baseDelayMs = options?.baseDelayMs ?? SETUP_GATE_POLL_BASE_MS;

	let lastResult!: T;

	for (let attempt = 0; attempt < attempts; attempt++) {
		lastResult = await previewGate(args);
		if (lastResult.valid || !isAwaitingPaidSetupWebhook(lastResult)) {
			return lastResult;
		}
		if (attempt < attempts - 1) {
			await sleep(baseDelayMs * 2 ** attempt);
		}
	}

	return lastResult;
}

export {
	isAwaitingPaidSetupWebhook,
	SETUP_GATE_POLL_ATTEMPTS,
	SETUP_GATE_POLL_BASE_MS,
};
