import { render } from "@react-email/render";
import SignerTurnEmail, {
	type SignerTurnEmailProps,
} from "../emails/signer-turn";

export type { SignerTurnEmailProps } from "../emails/signer-turn";
export {
	type SignerTurnCopy,
	type SignerTurnCopyInput,
	type SignerTurnVariant,
	signerTurnCopy,
	signerTurnSubject,
} from "./copy/signer-turn";

export async function renderSignerTurn(
	props: SignerTurnEmailProps,
): Promise<{ html: string; text: string }> {
	const element = SignerTurnEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
