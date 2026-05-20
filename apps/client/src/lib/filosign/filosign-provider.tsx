import type { DilithiumInstance } from "@filosign/crypto-utils/browser/dilithium";
import { FilosignProvider as FilosignProviderBase } from "@filosign/react";
import { useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import env from "@/src/env";
import { PersistedActiveOrganizationSync } from "@/src/lib/filosign/persisted-active-org";
import { dilithiumLoadPromise } from "@/src/lib/filosign/preload-dilithium";
import {
	hydrationMark,
	hydrationMarkAsyncEnd,
	hydrationMarkNow,
} from "@/src/lib/utils/hydration-lifecycle";
import { logger } from "@/src/lib/utils/logger";
import { Loader } from "../components/ui/loader";

export function FilosignProvider({ children }: { children: React.ReactNode }) {
	const { data: wallet } = useWalletClient();
	const [dilithium, setDilithium] = useState<DilithiumInstance | undefined>();

	useEffect(() => {
		hydrationMark("filosign-provider:mount");
	}, []);

	useEffect(() => {
		hydrationMark("filosign-provider:wallet-client", {
			hasWallet: Boolean(wallet),
			address: wallet?.account?.address?.slice(0, 10),
		});
	}, [wallet?.account?.address]);

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

	if (!dilithium) {
		return <Loader />;
	}

	return (
		<FilosignProviderBase
			apiBaseUrl={env.VITE_SERVER_URL}
			wasm={{ dilithium }}
			wallet={wallet}
			loader={Loader}
		>
			<PersistedActiveOrganizationSync />
			{children}
		</FilosignProviderBase>
	);
}
