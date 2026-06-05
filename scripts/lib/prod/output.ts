import type { ProbeResult } from "./types.ts";

export function printResult(result: ProbeResult): void {
	const label = result.ok ? "OK" : "FAIL";
	console.log(`[${result.id}] ${result.action} ${label} — ${result.summary}`);
	if (result.detail) console.log(result.detail);
}
