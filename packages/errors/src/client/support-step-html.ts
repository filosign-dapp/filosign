/** Escape HTML, then render limited inline markdown (bold) from support step lines. */
export function renderSupportStepHtml(text: string): string {
	const escaped = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
	return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
