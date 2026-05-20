import { LOGIN_RECOVERY_PHRASE_REQUIRED } from "@filosign/react/auth";
import { invalidateSessionQueries } from "@filosign/react/invalidate-queries";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	hydrationMark,
	hydrationMarkAsyncEnd,
	hydrationMarkNow,
} from "@/src/lib/utils/hydration-lifecycle";

export type WalletLoginMutation = {
	mutateAsync: (args?: Record<string, unknown>) => Promise<unknown>;
};

export type RecoverPhraseMutation = {
	mutateAsync: (args: { phrase: string }) => Promise<unknown>;
	isPending: boolean;
};

export async function attemptWalletLoginUnlock(args: {
	login: WalletLoginMutation;
	onRecoveryRequired: () => void;
}): Promise<void> {
	const started = hydrationMarkNow();
	hydrationMark("unlock:wallet-login-start", {
		note: "includes on-chain read + wallet sign (deriveDeterministicSeed32) + keygen",
	});

	try {
		await args.login.mutateAsync();
		hydrationMarkAsyncEnd("unlock:wallet-login-success", started);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "unknown";
		if (
			err instanceof Error &&
			err.message === LOGIN_RECOVERY_PHRASE_REQUIRED
		) {
			hydrationMarkAsyncEnd("unlock:wallet-login-recovery-required", started);
			args.onRecoveryRequired();
			return;
		}
		hydrationMarkAsyncEnd("unlock:wallet-login-failed", started, {
			message,
		});
		toast.error(
			err instanceof Error ? err.message : "Could not unlock session",
		);
		args.onRecoveryRequired();
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
