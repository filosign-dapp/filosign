import {
	SESv2Client,
	SendEmailCommand,
	type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import env from "@/env";
import type { OutboundEmail } from "@/lib/platform/email/types";

let sesClient: SESv2Client | null = null;

function sesCredentials():
	| { accessKeyId: string; secretAccessKey: string }
	| undefined {
	const accessKeyId = env.AWS_ACCESS_KEY_ID?.trim();
	const secretAccessKey = env.AWS_SECRET_ACCESS_KEY?.trim();
	if (accessKeyId && secretAccessKey) {
		return { accessKeyId, secretAccessKey };
	}
	return undefined;
}

function getSesClient(): SESv2Client {
	if (!sesClient) {
		const credentials = sesCredentials();
		sesClient = new SESv2Client({
			region: env.SES_REGION!,
			...(credentials ? { credentials } : {}),
		});
	}
	return sesClient;
}

/** @internal Test-only reset. */
export function resetSesClientForTests(): void {
	sesClient = null;
}

export async function sendViaSes(msg: OutboundEmail): Promise<{ id: string }> {
	const from = env.SES_FROM_EMAIL!.trim();
	const input: SendEmailCommandInput = {
		FromEmailAddress: from,
		Destination: { ToAddresses: [msg.to] },
		ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
		Content: {
			Simple: {
				Subject: { Data: msg.subject, Charset: "UTF-8" },
				Body: {
					Html: { Data: msg.html, Charset: "UTF-8" },
					Text: { Data: msg.text, Charset: "UTF-8" },
				},
				Headers: [
					{
						Name: "X-Filosign-Idempotency-Key",
						Value: msg.idempotencyKey,
					},
				],
			},
		},
		...(env.SES_CONFIGURATION_SET?.trim()
			? { ConfigurationSetName: env.SES_CONFIGURATION_SET.trim() }
			: {}),
	};

	const result = await getSesClient().send(new SendEmailCommand(input));
	const id = result.MessageId;
	if (!id) {
		throw new Error("SES returned no message id");
	}
	return { id };
}
