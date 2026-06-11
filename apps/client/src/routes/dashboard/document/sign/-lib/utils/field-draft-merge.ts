import type { FieldCompletionMap } from "@filosign/shared";

export function mergePersistedFieldCompletions(
	local: FieldCompletionMap,
	server: FieldCompletionMap,
	protectedFieldIds: readonly string[],
): FieldCompletionMap {
	const merged = { ...server };
	for (const id of protectedFieldIds) {
		if (local[id] !== undefined) merged[id] = local[id];
	}
	return merged;
}
