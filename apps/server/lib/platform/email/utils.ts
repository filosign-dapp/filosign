import { createHash } from "node:crypto";
import env from "@/env";

// ==========================================
// 1. Email Types
// ==========================================
export type EmailDeliveryProvider = "resend" | "ses";

export type OutboundEmail = {
	from: string;
	to: string;
	subject: string;
	html: string;
	text: string;
	replyTo?: string;
	idempotencyKey: string;
};

export type EmailDeliveryResult = {
	provider: EmailDeliveryProvider;
	id: string;
};

// ==========================================
// 2. HTML Escaping Utility
// ==========================================
/** Minimal HTML escaping for email fragments (user-controlled strings). */
export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

// ==========================================
// 3. Idempotency Key Generation
// ==========================================
export function buildEmailIdempotencyKey(segments: string[]): string {
	return createHash("sha256")
		.update(segments.join("\0"))
		.digest("hex")
		.slice(0, 240);
}

// ==========================================
// 4. Public URL Resolvers
// ==========================================
/** React app origin (no trailing slash). Used for links in email and elsewhere. */
export function getClientUrl(): string {
	return env.CLIENT_URL.replace(/\/$/, "");
}

/** API server origin (no trailing slash). Used for checkout magic links. */
export function getServerUrl(): string {
	return env.SERVER_URL.replace(/\/$/, "");
}

/** Marketing site origin (no trailing slash). */
export function getAstroUrl(): string {
	return env.ASTRO_URL.replace(/\/$/, "");
}

/** Resend From header: `Name <email>` when RESEND_FROM_NAME is set. */
export function resendFromAddress(): string {
	const email = env.RESEND_FROM_EMAIL;
	const name = env.RESEND_FROM_NAME?.trim();
	if (name) return `${name} <${email}>`;
	return email;
}
