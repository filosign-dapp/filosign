import { LoggingHandlerPlugin } from "@orpc/experimental-pino";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { Context, Next } from "hono";
import { Hono } from "hono";
import type { ApiRouterVariables } from "@/api/orpc/context";
import { optionalJwtWalletForOrpc } from "@/api/orpc/orpc-auth";
import env from "@/env";
import { logger } from "@/lib/platform/pino";
import { createContext, type OrpcContext } from "./context";
import { appRouter } from "./router";

const RPC_PREFIX = "/api/rpc";
const OPENAPI_REFERENCE_PREFIX = "/api/api-reference";

const BODY_PARSER_METHODS = new Set([
	"arrayBuffer",
	"blob",
	"formData",
	"json",
	"text",
] as const);
type BodyParserMethod =
	typeof BODY_PARSER_METHODS extends Set<infer U> ? U : never;

function proxyRawRequest(req: Context["req"], raw: Request): Request {
	return new Proxy(raw, {
		get(target, prop) {
			if (BODY_PARSER_METHODS.has(prop as BodyParserMethod)) {
				const method = prop as BodyParserMethod;
				return () => req[method]();
			}
			return Reflect.get(target, prop, target);
		},
	}) as Request;
}

function createPinoLogging() {
	return new LoggingHandlerPlugin<OrpcContext>({
		logger,
		generateId: () => crypto.randomUUID(),
		logRequestResponse: false,
		logRequestAbort: env.DEBUG,
	});
}

export const rpcHandler = new RPCHandler(appRouter, {
	plugins: [createPinoLogging()],
});

export const openapiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		createPinoLogging(),
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
});

export async function orpcHybridMiddleware(c: Context, next: Next) {
	const request = proxyRawRequest(c.req, c.req.raw);
	const context = await createContext({ context: c });

	const rpcResult = await rpcHandler.handle(request, {
		prefix: RPC_PREFIX,
		context,
	});

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const openResult = await openapiHandler.handle(request, {
		prefix: OPENAPI_REFERENCE_PREFIX,
		context,
	});

	if (openResult.matched) {
		return c.newResponse(openResult.response.body, openResult.response);
	}

	return next();
}

/** Hono `/api` mount: optional JWT + oRPC/OpenAPI hybrid handler. */
export const apiRouter = new Hono<{ Variables: ApiRouterVariables }>()
	.use("*", optionalJwtWalletForOrpc)
	.use("*", orpcHybridMiddleware);
