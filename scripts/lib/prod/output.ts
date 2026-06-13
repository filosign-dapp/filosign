import type { ProbeResult, ProdContext } from "./types.ts";

export function printResult(result: ProbeResult, ctx?: ProdContext): void {
	const label = result.ok ? "OK" : "FAIL";
	const line = `[${result.id}] ${result.action} ${label} - ${result.summary}`;
	if (ctx) ctx.log.info(line);
	else console.log(`[prod] ${line}`);

	const showDetail = ctx
		? ctx.verbose && result.detail
		: Boolean(result.detail);
	if (!showDetail || !result.detail) return;

	if (ctx) {
		ctx.log.detail(result.detail);
		return;
	}

	for (const part of result.detail.split("\n")) {
		if (part.trim()) console.log(`[prod]     ${part}`);
	}
}
