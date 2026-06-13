/** Filecoin epoch length (30s) - matches @filoz/synapse-core TIME_CONSTANTS. */
const MS_PER_EPOCH = 30_000;

/** Epochs of payment runway from now until `retentionUntil` (ceil). */
export function retentionEpochsFromUntil(retentionUntil: Date): bigint {
	const ms = retentionUntil.getTime() - Date.now();
	if (ms <= 0) return 0n;
	return BigInt(Math.ceil(ms / MS_PER_EPOCH));
}
