import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import env from "@/env";
import { isFocBackupEnabled } from "@/lib/domains/foc/enabled";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";
import {
	parseRelayerPool,
	relayerPoolAddresses,
} from "@/lib/platform/evm/relayer-pool";

function failBootstrap(stage: string, error: string): never {
	void emitCriticalPlatformEvent({
		name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
		severity: "critical",
		message: "Server bootstrap validation failed",
		context: { stage, error },
	});
	throw new Error(error);
}

/** FOC Synapse wallet key/address consistency at startup. */
export function validateFocWallet(): void {
	if (!isFocBackupEnabled()) {
		return;
	}

	const privateKey = env.FOC_WALLET_PRIVATE_KEY;
	const address = env.FOC_WALLET_ADDRESS;
	if (!privateKey || !address) {
		failBootstrap(
			"foc_wallet_missing",
			"FOC_BACKUP_ENABLED=true requires FOC_WALLET_PRIVATE_KEY and FOC_WALLET_ADDRESS",
		);
	}

	const focFromKey = getAddress(privateKeyToAccount(privateKey).address);
	if (focFromKey !== address) {
		failBootstrap(
			"foc_wallet_mismatch",
			`FOC_WALLET_PRIVATE_KEY address ${focFromKey} does not match FOC_WALLET_ADDRESS ${address}`,
		);
	}
}

/** Each pool member key must match its configured address. */
export function validateRelayerPoolKeys(): void {
	parseRelayerPool();
}

/** Pool members must be authorized relayers on FSEnvelopeRegistry. */
export async function validateRelayerPoolOnChain(): Promise<void> {
	const { fsContracts } = await import("@/lib/platform/evm");
	const pool = relayerPoolAddresses();
	for (const relayer of pool) {
		const authorized = await fsContracts.FSEnvelopeRegistry.read.isRelayer([
			relayer,
		]);
		if (!authorized) {
			failBootstrap(
				"registry_relayer_mismatch",
				`FSEnvelopeRegistry.isRelayer(${relayer}) is false`,
			);
		}
	}
}

export async function validateServerBootstrap(): Promise<void> {
	validateFocWallet();
	validateRelayerPoolKeys();
	await validateRelayerPoolOnChain();
}
