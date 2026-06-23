import type { ChainKey } from "@filosign/evm";
import config from "@/config";
import env from "@/env";
import { assertPimlicoProxyRateLimit } from "@/lib/platform/cache/pimlico-proxy-rate-limit";
import { logger } from "@/lib/platform/pino";
import { classifyPimlicoMethod } from "./allowlist";
import { forwardPimlicoRpc, rejectMethodNotAllowed } from "./forward";
import type { JsonRpcRequest } from "./jsonrpc";
import {
	JSON_RPC_ERROR_CODES,
	makeJsonRpcError,
	PimlicoProxyError,
	parseJsonRpcBody,
	serializeJsonRpcResponse,
} from "./jsonrpc";
import { assertAllowedIntegrationOrigin } from "./origin";
import {
	assertRegisteredSender,
	assertValidUserOpSender,
	extractUserOpSender,
} from "./sender";

export type PimlicoProxyHandleDeps = {
	chainKey: ChainKey;
	expectedChainId: number;
	pimlicoApiKey: string | undefined;
	sponsorshipEnabled: boolean;
	allowedOrigins: readonly string[];
	fetchImpl: typeof fetch;
	assertRateLimit: typeof assertPimlicoProxyRateLimit;
};

/** Call-time read so partial `@/config` mocks in other test files do not break the suite. */
function resolvePimlicoAllowedOrigins(): readonly string[] {
	const origins = config.http?.cors?.origin;
	if (origins && origins.length > 0) return origins;
	return [
		env.CLIENT_URL,
		env.ASTRO_URL,
		"http://localhost:3001",
		"http://localhost:3002",
	];
}

function resolvePimlicoExpectedChainId(): number {
	if (config.runtimeChain?.id !== undefined) return config.runtimeChain.id;
	if (env.CHAIN === "mainnet") return 8453;
	if (env.CHAIN === "testnet") return 84_532;
	return 31_337;
}

export function defaultPimlicoProxyDeps(): PimlicoProxyHandleDeps {
	return {
		chainKey: env.CHAIN,
		expectedChainId: resolvePimlicoExpectedChainId(),
		pimlicoApiKey: env.PIMLICO_API_KEY,
		sponsorshipEnabled: env.PIMLICO_SPONSORSHIP_ENABLED,
		allowedOrigins: resolvePimlicoAllowedOrigins(),
		fetchImpl: fetch,
		assertRateLimit: assertPimlicoProxyRateLimit,
	};
}

function sponsorshipDisabledError(): PimlicoProxyError {
	return new PimlicoProxyError(
		makeJsonRpcError(
			null,
			JSON_RPC_ERROR_CODES.sponsorshipDisabled,
			"Gas sponsorship is disabled on this environment",
		),
		403,
	);
}

function invalidChainError(chainIdParam: string): PimlicoProxyError {
	const parsed = Number.parseInt(chainIdParam, 10);
	return new PimlicoProxyError(
		makeJsonRpcError(
			null,
			JSON_RPC_ERROR_CODES.invalidParams,
			`Invalid or unsupported chainId: ${Number.isNaN(parsed) ? chainIdParam : parsed}`,
		),
		400,
	);
}

function toProxyResponse(error: PimlicoProxyError): {
	httpStatus: number;
	bodyText: string;
} {
	return {
		httpStatus: error.httpStatus,
		bodyText: serializeJsonRpcResponse(error.response),
	};
}

async function validateRequests(args: {
	requests: JsonRpcRequest[];
	clientIp: string;
	deps: PimlicoProxyHandleDeps;
}): Promise<void> {
	for (const request of args.requests) {
		const kind = classifyPimlicoMethod(request.method);
		if (!kind) {
			rejectMethodNotAllowed(request.id);
		}

		if (kind !== "sponsor") continue;

		const sender = assertValidUserOpSender({
			params: request.params,
			requestId: request.id,
		});

		await assertRegisteredSender({ sender, requestId: request.id });

		await args.deps.assertRateLimit({
			sender,
			clientIp: args.clientIp,
			requestId: request.id,
		});
	}
}

export async function handlePimlicoProxyRequest(args: {
	chainIdParam: string;
	origin: string | undefined;
	referer: string | undefined;
	body: unknown;
	clientIp: string;
	deps?: Partial<PimlicoProxyHandleDeps>;
}): Promise<{ httpStatus: number; bodyText: string }> {
	const deps: PimlicoProxyHandleDeps = {
		...defaultPimlicoProxyDeps(),
		...args.deps,
	};

	try {
		if (
			deps.chainKey === "local" ||
			!deps.sponsorshipEnabled ||
			!deps.pimlicoApiKey?.trim()
		) {
			throw sponsorshipDisabledError();
		}

		const expectedChainId = deps.expectedChainId;
		const chainIdParam = Number.parseInt(args.chainIdParam, 10);
		if (Number.isNaN(chainIdParam) || chainIdParam !== expectedChainId) {
			throw invalidChainError(args.chainIdParam);
		}

		assertAllowedIntegrationOrigin({
			origin: args.origin,
			referer: args.referer,
			allowedOrigins: deps.allowedOrigins,
		});

		const parsedBody = parseJsonRpcBody(args.body);
		if (!parsedBody.ok) {
			throw new PimlicoProxyError(parsedBody.error, 400);
		}

		await validateRequests({
			requests: parsedBody.value.requests,
			clientIp: args.clientIp,
			deps,
		});

		for (const request of parsedBody.value.requests) {
			const sender =
				classifyPimlicoMethod(request.method) === "sponsor"
					? extractUserOpSender(request.params)
					: undefined;
			logger.info({
				event: "pimlico_proxy.forward",
				method: request.method,
				chainId: chainIdParam,
				batchSize: parsedBody.value.requests.length,
				...(sender ? { sender } : {}),
			});
		}

		const forwarded = await forwardPimlicoRpc({
			chainId: chainIdParam,
			body: parsedBody.value.raw,
			apiKey: deps.pimlicoApiKey,
			fetchImpl: deps.fetchImpl,
		});

		return {
			httpStatus: forwarded.status,
			bodyText: forwarded.bodyText,
		};
	} catch (error) {
		if (error instanceof PimlicoProxyError) {
			return toProxyResponse(error);
		}
		throw error;
	}
}
