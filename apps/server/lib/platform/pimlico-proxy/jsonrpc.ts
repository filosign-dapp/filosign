import { z } from "zod";

const zJsonRpcId = z.union([z.string(), z.number(), z.null()]);

export const zJsonRpcRequest = z.object({
	jsonrpc: z.literal("2.0"),
	method: z.string().min(1),
	params: z.array(z.unknown()).optional(),
	id: zJsonRpcId,
});

export type JsonRpcId = z.infer<typeof zJsonRpcId>;
export type JsonRpcRequest = z.infer<typeof zJsonRpcRequest>;

export type JsonRpcErrorResponse = {
	jsonrpc: "2.0";
	id: JsonRpcId;
	error: { code: number; message: string };
};

export const JSON_RPC_ERROR_CODES = {
	parseError: -32700,
	invalidRequest: -32600,
	methodNotFound: -32601,
	invalidParams: -32602,
	internalError: -32603,
	unregisteredSender: -32_000,
	rateLimited: -32_005,
	sponsorshipDisabled: -32_601,
} as const;

export function makeJsonRpcError(
	id: JsonRpcId,
	code: number,
	message: string,
): JsonRpcErrorResponse {
	return {
		jsonrpc: "2.0",
		id,
		error: { code, message },
	};
}

export type ParsedJsonRpcBody = {
	requests: JsonRpcRequest[];
	isBatch: boolean;
	raw: JsonRpcRequest | JsonRpcRequest[];
};

export function parseJsonRpcBody(
	body: unknown,
):
	| { ok: true; value: ParsedJsonRpcBody }
	| { ok: false; error: JsonRpcErrorResponse } {
	if (Array.isArray(body)) {
		if (body.length === 0) {
			return {
				ok: false,
				error: makeJsonRpcError(
					null,
					JSON_RPC_ERROR_CODES.invalidRequest,
					"Batch request must not be empty",
				),
			};
		}
		const requests: JsonRpcRequest[] = [];
		for (const item of body) {
			const parsed = zJsonRpcRequest.safeParse(item);
			if (!parsed.success) {
				let id: JsonRpcId = null;
				if (typeof item === "object" && item !== null && "id" in item) {
					const parsedId = zJsonRpcId.safeParse(item.id);
					if (parsedId.success) id = parsedId.data;
				}
				return {
					ok: false,
					error: makeJsonRpcError(
						id,
						JSON_RPC_ERROR_CODES.invalidRequest,
						"Invalid JSON-RPC request in batch",
					),
				};
			}
			requests.push(parsed.data);
		}
		return { ok: true, value: { requests, isBatch: true, raw: requests } };
	}

	const parsed = zJsonRpcRequest.safeParse(body);
	if (!parsed.success) {
		return {
			ok: false,
			error: makeJsonRpcError(
				null,
				JSON_RPC_ERROR_CODES.invalidRequest,
				"Invalid JSON-RPC request",
			),
		};
	}
	return {
		ok: true,
		value: { requests: [parsed.data], isBatch: false, raw: parsed.data },
	};
}

export function serializeJsonRpcResponse(
	payload: JsonRpcErrorResponse | JsonRpcErrorResponse[],
): string {
	return JSON.stringify(payload);
}

export class PimlicoProxyError extends Error {
	constructor(
		public readonly response: JsonRpcErrorResponse,
		public readonly httpStatus: number,
	) {
		super(response.error.message);
		this.name = "PimlicoProxyError";
	}
}
