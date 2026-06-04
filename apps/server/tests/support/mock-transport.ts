import type { Transport } from "viem";

/** Minimal viem transport stub for unit tests (no network). */
export function mockChainRpcTransport(
	request: () => Promise<never>,
): Transport {
	return (() => {
		return {
			config: { key: "mock" },
			name: "mock",
			request,
			value: {} as never,
		};
	}) as unknown as Transport;
}
