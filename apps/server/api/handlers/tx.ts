import { ORPCError } from "@orpc/server";
import { isHash } from "viem";
import { ProcessTxUserError } from "@/lib/platform/indexer/errors";
import { processTransaction } from "@/lib/platform/indexer/process";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";
import { zIndexerTxBody } from "@/lib/platform/validation/tx-registration";

export async function txProcessIndexerHash(
	params: { hash: string },
	body: unknown,
) {
	const txHash = params.hash.trim();
	if (typeof txHash !== "string" || !isHash(txHash)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Transaction hash param is required and must be a valid hash",
		});
	}

	const parsedBody = zIndexerTxBody.safeParse(body ?? {});
	if (!parsedBody.success) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}

	const result = await tryCatch(processTransaction(txHash, parsedBody.data));
	if (!result.error) {
		return {};
	}

	const err = result.error;
	console.error("[tx] processTransaction failed", {
		txHash,
		message: err instanceof Error ? err.message : String(err),
	});

	if (err instanceof ProcessTxUserError) {
		throw new ORPCError("BAD_REQUEST", {
			message: err.message,
			status: err.httpStatus,
		});
	}

	throw new ORPCError("INTERNAL_SERVER_ERROR", {
		message: "We could not index that transaction. Try again shortly.",
	});
}
