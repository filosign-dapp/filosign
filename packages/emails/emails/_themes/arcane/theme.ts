/** Adapted from react-email demo 04-Arcane (MIT). */
import type { TailwindConfig } from "@react-email/components";
import plugin from "tailwindcss/plugin";

const colors = {
	canvas: "#F4F4F6",
	bg: "#FFFFFF",
	"bg-2": "#FBFCFB",
	fg: "#1F2123",
	"fg-2": "#43454B",
	"fg-3": "#707070",
	"fg-inverted": "#FFFFFC",
	stroke: "#D5D5DD",
	brand: "#202223",
} as const;

const fontScale = {
	11: {
		fontSize: "11px",
		lineHeight: "1.5",
		letterSpacing: "-0.033px",
		fontWeight: "300",
	},
	13: {
		fontSize: "13px",
		lineHeight: "1.5",
		letterSpacing: "-0.039px",
		fontWeight: "300",
	},
	14: { fontSize: "14px", lineHeight: "1.5" },
	15: {
		fontSize: "15px",
		lineHeight: "1.5",
		letterSpacing: "-0.075px",
		fontWeight: "500",
	},
	20: { fontSize: "20px", lineHeight: "1.2", letterSpacing: "-0.2px" },
	32: { fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.6px" },
	72: { fontSize: "72px", lineHeight: "0.95", letterSpacing: "-2.16px" },
} as const;

export const arcaneTailwindConfig: TailwindConfig = {
	plugins: [
		plugin(({ addUtilities, addVariant }) => {
			addVariant("mobile", "@media (max-width: 600px)");
			const utilities: Record<string, Record<string, string>> = {};
			for (const [step, token] of Object.entries(fontScale)) {
				utilities[`.font-${step}`] = token;
			}
			addUtilities(utilities);
		}),
	],
	theme: {
		extend: {
			colors,
			fontFamily: {
				sans: ["Arial", "Helvetica", "sans-serif"],
				serif: ["'Instrument Serif'", "Georgia", "serif"],
			},
		},
	},
};
