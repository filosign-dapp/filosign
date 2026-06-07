import { render } from "@react-email/render";
import PaidSetupEmail, { type PaidSetupEmailProps } from "../emails/paid-setup";

export type { PaidSetupEmailProps } from "../emails/paid-setup";

export async function renderPaidSetup(
	props: PaidSetupEmailProps,
): Promise<{ html: string; text: string }> {
	const element = PaidSetupEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
