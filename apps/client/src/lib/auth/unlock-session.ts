import { LOGIN_RECOVERY_PHRASE_REQUIRED } from "@filosign/react/auth";
import { invalidateSessionQueries } from "@filosign/react/invalidate-queries";
import type { QueryClient } from "@tanstack/react-query";
import {
	hydrationMark,
	hydrationMarkAsyncEnd,
	hydrationMarkNow,
} from "@/src/lib/utils/hydration-lifecycle";

export type WalletLoginMutation = {
	mutateAsync: () => Promise<unknown>;
};

export type RecoverPhraseMutation = {
	mutateAsync: (args: { phrase: string }) => Promise<unknown>;
	isPending: boolean;
};

export type WalletLoginUnlockOutcome =
	| "success"
	| "recovery_required"
	| { failed: string; isCancelled: boolean };

export function formatWalletUnlockError(err: unknown): string {
	if (!(err instanceof Error)) {
		return "Could not unlock with your wallet. Try again.";
	}
	const msg = err.message.toLowerCase();
	if (
		msg.includes("reject") ||
		msg.includes("denied") ||
		msg.includes("cancel") ||
		msg.includes("declined") ||
		msg.includes("user refused")
	) {
		return "Unlock cancelled. Confirm in your wallet to continue.";
	}
	if (msg.includes("network") || msg.includes("fetch")) {
		return "Network error while unlocking. Try again.";
	}
	if (msg.includes("server") || msg.includes("500")) {
		return "Server error while unlocking. Try again later.";
	}
	if (err.message === "User is not registered") {
		return "Account setup is still loading. Try again in a moment.";
	}
	return err.message || "Could not unlock with your wallet. Try again.";
}

export async function attemptWalletLoginUnlock(args: {
	login: WalletLoginMutation;
}): Promise<WalletLoginUnlockOutcome> {
	const started = hydrationMarkNow();
	hydrationMark("unlock:wallet-login-start", {
		note: "includes on-chain read + wallet sign (deriveDeterministicSeed32) + keygen",
	});

	try {
		await args.login.mutateAsync();
		hydrationMarkAsyncEnd("unlock:wallet-login-success", started);
		return "success";
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "unknown";
		if (
			err instanceof Error &&
			err.message === LOGIN_RECOVERY_PHRASE_REQUIRED
		) {
			hydrationMarkAsyncEnd("unlock:wallet-login-recovery-required", started);
			return "recovery_required";
		}
		hydrationMarkAsyncEnd("unlock:wallet-login-failed", started, {
			message,
		});
		const isCancelled =
			err instanceof Error &&
			(message.toLowerCase().includes("reject") ||
				message.toLowerCase().includes("denied") ||
				message.toLowerCase().includes("cancel") ||
				message.toLowerCase().includes("declined") ||
				message.toLowerCase().includes("user refused"));
		return { failed: formatWalletUnlockError(err), isCancelled };
	}
}

export function formatRecoveryPhraseError(recoverErr: unknown): string {
	if (!(recoverErr instanceof Error)) return "Recovery failed";
	const msg = recoverErr.message;
	if (
		msg.includes("phrase") ||
		msg.includes("recovery") ||
		msg.includes("Invalid") ||
		msg.includes("unlock")
	) {
		return "Invalid recovery phrase";
	}
	if (msg.includes("network") || msg.includes("fetch")) {
		return "Network error - please try again";
	}
	if (msg.includes("server") || msg.includes("500")) {
		return "Server error - please try again later";
	}
	return msg;
}

export async function submitRecoveryPhraseUnlock(args: {
	phrase: string;
	recoverWithPhrase: RecoverPhraseMutation;
	queryClient: QueryClient;
	walletAddress: string | undefined;
}): Promise<void> {
	const started = hydrationMarkNow();
	hydrationMark("unlock:recovery-phrase-start");
	await args.recoverWithPhrase.mutateAsync({ phrase: args.phrase });
	hydrationMarkAsyncEnd("unlock:recovery-phrase-done", started);
	await invalidateSessionQueries(args.queryClient, args.walletAddress);
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
