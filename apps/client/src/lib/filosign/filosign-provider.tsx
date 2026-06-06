import type { DilithiumInstance } from "@filosign/crypto-utils/browser/dilithium";
import {
	FilosignProvider as FilosignProviderBase,
	type FilosignWallet,
} from "@filosign/react";
import { useEffect, useState } from "react";
import { useAuthToken } from "thirdweb/react";
import env from "@/src/env";
import { AutoRegisterProvider } from "@/src/lib/auth/auto-register-provider";
import { CryptoUnlockProvider } from "@/src/lib/auth/crypto-unlock-provider";
import { PersistedActiveOrganizationSync } from "@/src/lib/filosign/persisted-active-org";
import { dilithiumLoadPromise } from "@/src/lib/filosign/preload-dilithium";
import {
	hydrationMark,
	hydrationMarkAsyncEnd,
	hydrationMarkNow,
} from "@/src/lib/utils/hydration-lifecycle";
import { logger } from "@/src/lib/utils/logger";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";
import { Loader } from "../components/ui/loader";

export function FilosignProvider({ children }: { children: React.ReactNode }) {
	const { viemWallet } = useThirdweb();
	const thirdwebAuthToken = useAuthToken();
	const walletForSdk: FilosignWallet | undefined = viemWallet?.account
		? (viemWallet as FilosignWallet)
		: undefined;
	const [dilithium, setDilithium] = useState<DilithiumInstance | undefined>();

	useEffect(() => {
		hydrationMark("filosign-provider:mount");
	}, []);

	useEffect(() => {
		hydrationMark("filosign-provider:wallet-client", {
			hasWallet: Boolean(walletForSdk),
			address: walletForSdk?.account.address?.slice(0, 10),
		});
	}, [walletForSdk?.account.address]);

	useEffect(() => {
		let mounted = true;
		const started = hydrationMarkNow();
		hydrationMark("filosign-provider:dilithium-load-start");

		void dilithiumLoadPromise
			.then((dil) => {
				if (mounted) {
					setDilithium(dil);
					hydrationMarkAsyncEnd("filosign-provider:dilithium-ready", started);
				}
			})
			.catch((err) => {
				hydrationMarkAsyncEnd("filosign-provider:dilithium-failed", started, {
					error: err instanceof Error ? err.message : "unknown",
				});
				logger.error("Failed to init Dilithium:", err);
			});

		return () => {
			mounted = false;
		};
	}, []);

	return (
		<FilosignProviderBase
			apiBaseUrl={env.VITE_SERVER_URL}
			wasm={{ dilithium }}
			wallet={walletForSdk}
			thirdwebAuthToken={thirdwebAuthToken ?? null}
			loader={Loader}
		>
			<AutoRegisterProvider>
				<CryptoUnlockProvider>
					<PersistedActiveOrganizationSync />
					{children}
				</CryptoUnlockProvider>
			</AutoRegisterProvider>
		</FilosignProviderBase>
	);
}
