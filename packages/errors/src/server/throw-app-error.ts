import { ORPCError } from "@orpc/server";
import type { AppErrorCode, ErrorParams } from "../catalog/index";
import { getErrorDefinition } from "../get-error-definition";
import { interpolateTemplate } from "../interpolate";
import type { OrpcErrorCode } from "../types";

type ThrowOptions<Code extends AppErrorCode> =
	ErrorParams<Code> extends never
		? { cause?: unknown }
		: { params: ErrorParams<Code>; cause?: unknown };

export function throwAppError<Code extends AppErrorCode>(
	code: Code,
	...args: ErrorParams<Code> extends never
		? [options?: ThrowOptions<Code>]
		: [options: ThrowOptions<Code>]
): never {
	const def = getErrorDefinition(code);
	if (!def) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Unknown app error code: ${code}`,
		});
	}

	const options = args[0];
	const params =
		options && "params" in options
			? (options.params as Record<string, string | number | boolean>)
			: undefined;

	const message = interpolateTemplate(def.title, params);
	const data: Record<string, unknown> = { appCode: code };
	if (params) data.params = params;

	const orpcCode = def.defaultOrpcCode as OrpcErrorCode;

	if (options?.cause !== undefined) {
		console.error(`[${code}]`, options.cause);
	}

	throw new ORPCError(orpcCode, { message, data });
}
