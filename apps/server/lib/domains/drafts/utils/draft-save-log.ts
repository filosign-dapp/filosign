import { logger } from "@/lib/platform/pino";

export function logDraftSave(
	step: string,
	data?: Record<string, unknown>,
): void {
	logger.info({ ...data, draftSaveStep: step }, `[draft-save] ${step}`);
}
