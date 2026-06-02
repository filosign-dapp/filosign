import { ORPCError } from "@orpc/server";
import { isHash } from "viem";
import { enqueueIndexerTransaction } from "@/lib/platform/jobs";
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

	await enqueueIndexerTransaction({
		txHash,
		body: parsedBody.data ?? {},
	});

	return { queued: true as const, txHash };
}
