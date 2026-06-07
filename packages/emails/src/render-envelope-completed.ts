import { render } from "@react-email/render";
import EnvelopeCompletedEmail, {
	type EnvelopeCompletedEmailProps,
} from "../emails/envelope-completed";

export type { EnvelopeCompletedEmailProps } from "../emails/envelope-completed";

export async function renderEnvelopeCompleted(
	props: EnvelopeCompletedEmailProps,
): Promise<{ html: string; text: string }> {
	const element = EnvelopeCompletedEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
