import * as api from "./api.ts";
import * as backups from "./backups.ts";
import * as dragonfly from "./dragonfly.ts";
import { printResult } from "./output.ts";
import * as postgres from "./postgres.ts";
import type { Action, ProbeResult, ProdContext, ServiceId } from "./types.ts";
import * as worker from "./worker.ts";

const handlers: Record<
	ServiceId,
	{ probe: (ctx: ProdContext, action: Action) => Promise<ProbeResult> }
> = {
	postgres: { probe: postgres.probe },
	backups: { probe: backups.probe },
	dragonfly: { probe: dragonfly.probe },
	api: { probe: api.probe },
	worker: { probe: worker.probe },
};

export async function runProbe(
	ctx: ProdContext,
	service: ServiceId,
	action: Action,
): Promise<ProbeResult> {
	return handlers[service].probe(ctx, action);
}

export async function runMany(
	ctx: ProdContext,
	targets: ServiceId[],
	action: Action,
): Promise<number> {
	const results: ProbeResult[] = [];
	for (const service of targets) {
		results.push(await runProbe(ctx, service, action));
	}
	for (const result of results) {
		printResult(result);
	}
	return results.every((r) => r.ok) ? 0 : 1;
}
