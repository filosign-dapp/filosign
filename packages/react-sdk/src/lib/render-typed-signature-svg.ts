const SIGNATURE_FONT_FAMILIES: Record<string, string> = {
	typed: "ui-monospace, SFMono-Regular, Menlo, monospace",
	caveat: '"Caveat", cursive',
	"gloria-hallelujah": '"Gloria Hallelujah", cursive',
	"homemade-apple": '"Homemade Apple", cursive',
	"nothing-you-could-do": '"Nothing You Could Do", cursive',
	"reenie-beanie": '"Reenie Beanie", cursive',
	"mr-dafoe": '"Mr Dafoe", cursive',
};

export function renderTypedSignatureSvg(args: {
	text: string;
	fontId: string;
	width?: number;
	height?: number;
}): string {
	const width = args.width ?? 520;
	const height = args.height ?? 140;
	const fontFamily =
		SIGNATURE_FONT_FAMILIES[args.fontId] ??
		SIGNATURE_FONT_FAMILIES.typed ??
		"sans-serif";
	const fontSize = args.fontId === "typed" ? 28 : 42;
	const escaped = args.text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
    font-family="${fontFamily}" font-size="${fontSize}" fill="#111827">${escaped}</text>
</svg>`;
}
