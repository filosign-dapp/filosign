/**
 * Narrow viem `contract.write` when generated typings omit relay methods.
 * Callers declare the method signatures they invoke; runtime is unchanged.
 */
export function relayContractWrite<TWrite>(write: unknown): TWrite {
	return write as TWrite;
}
