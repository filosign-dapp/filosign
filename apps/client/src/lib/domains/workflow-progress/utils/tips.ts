export const WORKFLOW_TIP_INTERVAL_MS = 3_000;

export function pickRandomWorkflowTip<T extends string>(
	tips: readonly T[],
	exclude?: T,
): T {
	const pool =
		exclude && tips.length > 1 ? tips.filter((tip) => tip !== exclude) : tips;
	const index = Math.floor(Math.random() * pool.length);
	return pool[index] ?? tips[0];
}
