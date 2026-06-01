import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import env from "@/env";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";

function failBootstrap(stage: string, error: string): never {
	void emitCriticalPlatformEvent({
		name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
		severity: "critical",
		message: "Server bootstrap validation failed",
		context: { stage, error },
	});
	throw new Error(error);
}

/** Relayer key/address consistency at startup. */
export function validateRelayerWallet(): void {
	const relayerFromKey = getAddress(
		privateKeyToAccount(env.FC_SERVER_PRIVATE_KEY).address,
	);
	if (relayerFromKey !== env.FC_SERVER_ADDRESS) {
		failBootstrap(
			"relayer_wallet_mismatch",
			`FC_SERVER_PRIVATE_KEY address ${relayerFromKey} does not match FC_SERVER_ADDRESS ${env.FC_SERVER_ADDRESS}`,
		);
	}
}

/** KMS relayer must match FSEnvelopeRegistry.server() on-chain. */
export async function validateRegistryServer(): Promise<void> {
	const { fsContracts } = await import("@/lib/platform/evm");
	const onChainServer = getAddress(
		await fsContracts.FSEnvelopeRegistry.read.server(),
	);
	const configured = getAddress(env.FC_SERVER_ADDRESS);
	if (onChainServer !== configured) {
		failBootstrap(
			"registry_server_mismatch",
			`FSEnvelopeRegistry.server() ${onChainServer} does not match FC_SERVER_ADDRESS ${configured}`,
		);
	}
}

export async function validateServerBootstrap(): Promise<void> {
	validateRelayerWallet();
	await validateRegistryServer();
}
