import env from "@/env";
import { isRetryableResendFailure } from "@/lib/platform/email/resend-errors";
import { sendViaResend } from "@/lib/platform/email/resend-transport";
import { isSesDeliveryConfigured } from "@/lib/platform/email/ses-config";
import { sendViaSes } from "@/lib/platform/email/ses-transport";
import type {
	EmailDeliveryResult,
	OutboundEmail,
} from "@/lib/platform/email/types";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

function outboundFromResendDefaults(msg: OutboundEmail): OutboundEmail {
	return {
		...msg,
		from: msg.from || env.RESEND_FROM_EMAIL,
		replyTo: msg.replyTo ?? env.RESEND_FROM_EMAIL,
	};
}

/**
 * Primary: Resend. Fallback: SES when configured and Resend failed retryably.
 * All product email should call this (via invites.ts), not transports directly.
 */
export async function deliverOutboundEmail(
	msg: OutboundEmail,
): Promise<EmailDeliveryResult> {
	const outbound = outboundFromResendDefaults(msg);

	const resendRes = await tryCatch(sendViaResend(outbound));
	if (!resendRes.error) {
		console.info("[email] sent", {
			provider: "resend",
			id: resendRes.data.id,
			to: outbound.to,
		});
		return { provider: "resend", id: resendRes.data.id };
	}

	const resendError = resendRes.error;
	if (!isRetryableResendFailure(resendError) || !isSesDeliveryConfigured()) {
		throw resendError;
	}

	console.warn("[email] Resend failed; attempting SES fallback", {
		to: outbound.to,
		error:
			resendError instanceof Error ? resendError.message : String(resendError),
	});

	const sesRes = await tryCatch(sendViaSes(outbound));
	if (sesRes.error) {
		const primary =
			resendError instanceof Error ? resendError.message : String(resendError);
		const secondary =
			sesRes.error instanceof Error
				? sesRes.error.message
				: String(sesRes.error);
		throw new Error(
			`Email delivery failed (Resend: ${primary}; SES fallback: ${secondary})`,
		);
	}

	console.info("[email] sent", {
		provider: "ses",
		id: sesRes.data.id,
		to: outbound.to,
		fallback: true,
	});
	return { provider: "ses", id: sesRes.data.id };
}
