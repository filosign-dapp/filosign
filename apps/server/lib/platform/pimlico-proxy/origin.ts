import {
	JSON_RPC_ERROR_CODES,
	makeJsonRpcError,
	PimlicoProxyError,
} from "./jsonrpc";

function originFromReferer(referer: string | undefined): string | null {
	if (!referer?.trim()) return null;
	try {
		return new URL(referer).origin;
	} catch {
		return null;
	}
}

export function resolveRequestOrigin(args: {
	origin: string | undefined;
	referer: string | undefined;
}): string | null {
	if (args.origin?.trim()) return args.origin.trim();
	return originFromReferer(args.referer);
}

export function isAllowedIntegrationOrigin(args: {
	requestOrigin: string | null;
	allowedOrigins: readonly string[];
}): boolean {
	if (!args.requestOrigin) return false;
	const allowed = new Set(
		args.allowedOrigins.map((url) => new URL(url).origin),
	);
	return allowed.has(args.requestOrigin);
}

export function assertAllowedIntegrationOrigin(args: {
	origin: string | undefined;
	referer: string | undefined;
	allowedOrigins: readonly string[];
}): void {
	const requestOrigin = resolveRequestOrigin(args);
	if (
		isAllowedIntegrationOrigin({
			requestOrigin,
			allowedOrigins: args.allowedOrigins,
		})
	) {
		return;
	}

	throw new PimlicoProxyError(
		makeJsonRpcError(
			null,
			JSON_RPC_ERROR_CODES.invalidRequest,
			"Request origin is not allowed",
		),
		403,
	);
}
