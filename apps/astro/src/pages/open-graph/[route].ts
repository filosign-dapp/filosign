import type { OGImageOptions } from "astro-og-canvas";
import { OGImageRoute } from "astro-og-canvas";
import { MARKETING_OG_PAGES } from "../../content/og-marketing";

/** Variable Inter - Latin (paths relative to `apps/astro/` project root). */
const interLatinWght =
	"./node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2";

function filosignCardStyle(): Pick<
	OGImageOptions,
	"logo" | "bgGradient" | "border" | "padding" | "font" | "fonts"
> {
	return {
		logo: {
			path: "./public/logo.webp",
			size: [128],
		},
		bgGradient: [
			[24, 26, 28],
			[18, 22, 20],
		],
		border: {
			color: [90, 120, 70],
			width: 5,
			side: "inline-start",
		},
		padding: 64,
		fonts: [interLatinWght],
		font: {
			title: {
				size: 52,
				lineHeight: 1.12,
				color: [250, 250, 248],
				families: ["Inter"],
				weight: "Bold",
			},
			description: {
				size: 26,
				lineHeight: 1.38,
				color: [186, 192, 200],
				families: ["Inter"],
				weight: "Normal",
			},
		},
	};
}

export const { getStaticPaths, GET } = await OGImageRoute({
	param: "route",
	pages: { ...MARKETING_OG_PAGES },
	getImageOptions: (_key, page) => ({
		title: page.title,
		description: page.description,
		...filosignCardStyle(),
	}),
});
