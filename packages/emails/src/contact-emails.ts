/** Inbox routing aliases (all forward to the same mailbox; used for filtering). */
export const FILOSIGN_CONTACT_EMAILS = {
	hello: "hello@filosign.xyz",
	support: "support@filosign.xyz",
	contract: "contract@filosign.xyz",
	founder: "kartik@filosign.xyz",
} as const;

export type FilosignContactEmail = keyof typeof FILOSIGN_CONTACT_EMAILS;

export function filosignContactEmail(channel: FilosignContactEmail): string {
	return FILOSIGN_CONTACT_EMAILS[channel];
}

export function filosignMailto(channel: FilosignContactEmail): string {
	return `mailto:${filosignContactEmail(channel)}`;
}

export type FilosignTransactionalEmailKind =
	| "document"
	| "envelope_completed"
	| "signer_turn"
	| "partner_invite"
	| "workspace_invite"
	| "access_approved"
	| "paid_setup"
	| "checkout_continue";

/** Reply-to / footer mailto channel per outbound product email. */
export const FILOSIGN_TRANSACTIONAL_EMAIL_CHANNELS = {
	document: "contract",
	envelope_completed: "contract",
	signer_turn: "contract",
	partner_invite: "founder",
	workspace_invite: "support",
	access_approved: "hello",
	paid_setup: "hello",
	checkout_continue: "hello",
} as const satisfies Record<
	FilosignTransactionalEmailKind,
	FilosignContactEmail
>;

export function replyToForTransactionalEmail(
	kind: FilosignTransactionalEmailKind,
): string {
	return filosignContactEmail(FILOSIGN_TRANSACTIONAL_EMAIL_CHANNELS[kind]);
}
