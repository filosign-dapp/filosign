import z from "zod";

/** Indexer work is queued; receipt confirmation runs on the worker (HTTP 200 + queued contract). */
export const rpcTxProcessIndexerHashOutputSchema = z.object({
	queued: z.literal(true),
	txHash: z.string(),
});
