import { Resend } from "resend";
import env from "@/env";
import { toResendFailureError } from "@/lib/platform/email/resend-errors";
import type { OutboundEmail } from "@/lib/platform/email/types";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
	if (!resendClient) {
		resendClient = new Resend(env.RESEND_API_KEY);
	}
	return resendClient;
}

/** @internal Test-only reset. */
export function resetResendClientForTests(): void {
	resendClient = null;
}

export async function sendViaResend(
	msg: OutboundEmail,
): Promise<{ id: string }> {
	const { data, error } = await getResendClient().emails.send(
		{
			from: msg.from,
			to: msg.to,
			subject: msg.subject,
			text: msg.text,
			html: msg.html,
			replyTo: msg.replyTo,
		},
		{
			headers: {
				"Idempotency-Key": msg.idempotencyKey,
			},
		},
	);
	if (error) {
		throw toResendFailureError(error);
	}
	if (!data?.id) {
		throw new Error("Resend returned no message id");
	}
	return { id: data.id };
}
