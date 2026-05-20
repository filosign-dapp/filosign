import {
	type DilithiumInstance,
	loadBrowserDilithium,
} from "@filosign/crypto-utils/browser/dilithium";
import { FilosignProvider as FilosignProviderBase } from "@filosign/react";
import { useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import env from "@/src/env";
import { PersistedActiveOrganizationSync } from "@/src/lib/context/persisted-active-org";
import { Loader } from "../components/ui/loader";
import { logger } from "../utils/logger";

export function FilosignProvider({ children }: { children: React.ReactNode }) {
	const { data: wallet } = useWalletClient();
	const [dilithium, setDilithium] = useState<DilithiumInstance | undefined>();

	useEffect(() => {
		let mounted = true;

		void loadBrowserDilithium()
			.then((dil) => {
				if (mounted) setDilithium(dil);
			})
			.catch((err) => {
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
