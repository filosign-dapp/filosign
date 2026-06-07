import { render } from "@react-email/render";
import AccessRequestApprovedEmail, {
	type AccessRequestApprovedEmailProps,
} from "../emails/access-request-approved";

export type { AccessRequestApprovedEmailProps } from "../emails/access-request-approved";

export async function renderAccessRequestApproved(
	props: AccessRequestApprovedEmailProps,
): Promise<{ html: string; text: string }> {
	const element = AccessRequestApprovedEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
