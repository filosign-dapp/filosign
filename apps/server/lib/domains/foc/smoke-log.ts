import env from "@/env";
import { logger } from "@/lib/platform/pino";

/** Verbose FOC lifecycle logs when `TEST_FOC=true` (local/prod smoke). */
export function logFocSmoke(
	message: string,
	detail?: Record<string, unknown>,
): void {
	if (!env.TEST_FOC) return;
	logger.info({ focSmoke: true, ...detail }, `foc-smoke: ${message}`);
}
