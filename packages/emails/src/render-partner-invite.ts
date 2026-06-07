import { render } from "@react-email/render";
import PartnerInviteEmail, {
	type PartnerInviteEmailProps,
} from "../emails/partner-invite";

export type { PartnerInviteEmailProps } from "../emails/partner-invite";

export async function renderPartnerInvite(
	props: PartnerInviteEmailProps,
): Promise<{ html: string; text: string }> {
	const element = PartnerInviteEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
