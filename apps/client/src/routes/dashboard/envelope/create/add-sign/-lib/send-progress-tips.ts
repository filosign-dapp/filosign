/**
 * Short tips shown during send. Keep them accurate, actionable, and unrelated
 * to the current step label. Edit the list here.
 */
export const SEND_PROGRESS_TIPS = [
	"Place every field before you send. Signers open the document on the spots you picked.",
	"Need a break? Save a draft and return to field placement later.",
	"Use undo and redo while placing fields. Small fixes beat starting over.",
	"Double-check recipient emails now. After send, changes require a new envelope.",
	"On the signer list too? Finish your fields as soon as sending completes.",
	"Keep this tab open. Signing happens here automatically.",
	"Each on-chain step runs in order. Leaving early can interrupt sending.",
	"Give your draft a clear name so you can find it quickly in your dashboard.",
] as const;

export type SendProgressTip = (typeof SEND_PROGRESS_TIPS)[number];

export const SEND_PROGRESS_TIP_INTERVAL_MS = 3_000;

export function pickRandomSendProgressTip(
	exclude?: SendProgressTip,
): SendProgressTip {
	const pool =
		exclude && SEND_PROGRESS_TIPS.length > 1
			? SEND_PROGRESS_TIPS.filter((tip) => tip !== exclude)
			: SEND_PROGRESS_TIPS;
	const index = Math.floor(Math.random() * pool.length);
	return pool[index] ?? SEND_PROGRESS_TIPS[0];
}
