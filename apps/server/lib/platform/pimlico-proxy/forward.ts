import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	JSON_RPC_ERROR_CODES,
	type JsonRpcId,
	makeJsonRpcError,
	PimlicoProxyError,
} from "./jsonrpc";

export function pimlicoRpcUrl(chainId: number, apiKey: string): string {
	return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${apiKey}`;
}

export async function forwardPimlicoRpc(args: {
	chainId: number;
	body: unknown;
	apiKey: string;
	fetchImpl?: typeof fetch;
}): Promise<{ status: number; bodyText: string }> {
	const fetchImpl = args.fetchImpl ?? fetch;
	const url = pimlicoRpcUrl(args.chainId, args.apiKey);
	const result = await tryCatch(
		fetchImpl(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(args.body),
		}),
	);

	if (result.error) {
		throw new PimlicoProxyError(
			makeJsonRpcError(
				null,
				JSON_RPC_ERROR_CODES.internalError,
				"Internal proxy request failed to reach bundler",
			),
			500,
		);
	}

	const bodyText = await result.data.text();
	return { status: result.data.status, bodyText };
}

export function rejectMethodNotAllowed(requestId: JsonRpcId): never {
	throw new PimlicoProxyError(
		makeJsonRpcError(
			requestId,
			JSON_RPC_ERROR_CODES.methodNotFound,
			"Method not allowed",
		),
		400,
	);
}
