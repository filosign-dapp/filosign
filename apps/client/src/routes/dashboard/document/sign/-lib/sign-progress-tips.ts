/**
 * Short tips shown during signing. Keep them accurate, actionable, and unrelated
 * to the current step label. Edit the list here.
 */
export const SIGN_PROGRESS_TIPS = [
	"Signing runs automatically in your Filosign wallet.",
	"Double-check every field before you sign. Changes after signing require a new envelope.",
	"Keep this tab open until signing finishes.",
	"Each step runs in order. Leaving early can interrupt signing.",
	"If a payout is attached, you acknowledged the disclosure on the previous screen.",
	"Your signature is bound to the fields you completed, not the whole PDF by default.",
	"Need a saved signature? Open the signature library from your profile settings.",
	"After signing, you can download a compliance packet from the document page.",
] as const;

export type SignProgressTip = (typeof SIGN_PROGRESS_TIPS)[number];
