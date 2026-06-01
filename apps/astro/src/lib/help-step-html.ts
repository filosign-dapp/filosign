/** Escape HTML, then render limited inline MDX (bold) from help step lines. */
export function renderHelpStepHtml(text: string): string {
	const escaped = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
	return escaped.replace(
		/\*\*([^*]+)\*\*/g,
		'<strong class="font-medium text-foreground">$1</strong>',
	);
}
