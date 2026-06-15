import type { SendFileDeps } from "./types";

const TERMINAL_STATUSES = new Set(["registered", "failed"]);

export type RegistrationStatusPollResult = {
	registrationStatus: "queued" | "registering" | "registered" | "failed";
	registerError: string | null;
	onchainTxHash: `0x${string}` | null;
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollRegistrationStatus(args: {
	rpcQuery: SendFileDeps["rpcQuery"];
	pieceCid: string;
	initialStatus?: RegistrationStatusPollResult["registrationStatus"];
	maxWaitMs?: number;
	onProgress?: (status: RegistrationStatusPollResult) => void;
}): Promise<RegistrationStatusPollResult> {
	const maxWaitMs = args.maxWaitMs ?? 90_000;
	const startedAt = Date.now();
	let delayMs = 500;

	let latest: RegistrationStatusPollResult = {
		registrationStatus: args.initialStatus ?? "queued",
		registerError: null,
		onchainTxHash: null,
	};

	while (Date.now() - startedAt < maxWaitMs) {
		const snapshot = await args.rpcQuery.files.registrationStatus.call({
			pieceCid: args.pieceCid,
		});
		latest = snapshot;
		args.onProgress?.(snapshot);

		if (TERMINAL_STATUSES.has(snapshot.registrationStatus)) {
			return snapshot;
		}

		await sleep(delayMs);
		delayMs = Math.min(Math.round(delayMs * 1.5), 5_000);
	}

	return latest;
}
