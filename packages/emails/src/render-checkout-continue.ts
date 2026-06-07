import { render } from "@react-email/render";
import CheckoutContinueEmail, {
	type CheckoutContinueEmailProps,
} from "../emails/checkout-continue";

export type { CheckoutContinueEmailProps } from "../emails/checkout-continue";

export async function renderCheckoutContinue(
	props: CheckoutContinueEmailProps,
): Promise<{ html: string; text: string }> {
	const element = CheckoutContinueEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
