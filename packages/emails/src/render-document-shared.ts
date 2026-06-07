import { render } from "@react-email/render";
import DocumentSharedEmail, {
	type DocumentSharedEmailProps,
} from "../emails/document-shared";

export type { DocumentSharedEmailProps } from "../emails/document-shared";
export {
	type DocumentSharedContext,
	type DocumentSharedIntent,
	type DocumentSharedVariant,
	documentSharedCopy,
	documentSharedSubject,
} from "./copy/document-shared";

export async function renderDocumentShared(
	props: DocumentSharedEmailProps,
): Promise<{ html: string; text: string }> {
	const element = DocumentSharedEmail(props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
