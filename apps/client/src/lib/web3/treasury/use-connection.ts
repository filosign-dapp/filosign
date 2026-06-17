import { useCallback, useRef, useState } from "react";
import type { Address } from "viem";
import { treasuryChainId } from "@/src/lib/web3/treasury/chain";
import {
	connectTreasuryWalletSession,
	type TreasuryWalletSession,
} from "@/src/lib/web3/treasury/session";
import type { TreasuryConnectionStatus } from "@/src/lib/web3/treasury/types";

export function useTreasuryConnection() {
	const [session, setSession] = useState<TreasuryWalletSession | null>(null);
	const [status, setStatus] = useState<TreasuryConnectionStatus>("idle");
	const [error, setError] = useState<Error | null>(null);
	const sessionRef = useRef<TreasuryWalletSession | null>(null);
	sessionRef.current = session;

	const connect = useCallback(async (): Promise<TreasuryWalletSession> => {
		setStatus("connecting");
		setError(null);
		try {
			const next = await connectTreasuryWalletSession();
			sessionRef.current = next;
			setSession(next);
			setStatus("connected");
			return next;
		} catch (err) {
			const nextError =
				err instanceof Error ? err : new Error("Treasury connection failed.");
			setError(nextError);
			setStatus("error");
			throw nextError;
		}
	}, []);

	const disconnect = useCallback(async () => {
		const active = sessionRef.current;
		if (active) {
			await active.disconnect();
		}
		sessionRef.current = null;
		setSession(null);
		setStatus("idle");
		setError(null);
	}, []);

	const beginSigning = useCallback(() => {
		setStatus("signing");
	}, []);

	const beginPollingSafe = useCallback(() => {
		setStatus("polling_safe");
	}, []);

	const reset = useCallback(() => {
		sessionRef.current = null;
		setSession(null);
		setStatus("idle");
		setError(null);
	}, []);

	const address: Address | undefined = session?.address;

	return {
		chainId: treasuryChainId(),
		session,
		address,
		status,
		error,
		connect,
		disconnect,
		beginSigning,
		beginPollingSafe,
		reset,
	};
}
