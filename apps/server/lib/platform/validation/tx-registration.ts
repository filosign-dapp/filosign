import { z } from "zod";

/** POST /tx/:hash JSON body - usually `{}` for file-registry relay txs (receipt wait only). */
export const zIndexerTxBody = z.looseObject({}).optional();

export type IndexerTxBodyParsed = z.infer<typeof zIndexerTxBody>;
