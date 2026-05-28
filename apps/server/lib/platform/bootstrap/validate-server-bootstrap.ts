import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import env from "@/env";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";

/** Relayer key/address consistency at startup. */
export function validateServerBootstrap(): void {
	const relayerFromKey = getAddress(
		privateKeyToAccount(env.FC_SERVER_PRIVATE_KEY).address,
	);
	if (relayerFromKey !== env.FC_SERVER_ADDRESS) {
		const error = `FC_SERVER_PRIVATE_KEY address ${relayerFromKey} does not match FC_SERVER_ADDRESS ${env.FC_SERVER_ADDRESS}`;
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
			severity: "critical",
			message: "Server bootstrap validation failed",
			context: {
				stage: "relayer_wallet_mismatch",
				error,
			},
		});
		throw new Error(error);
	}
}
