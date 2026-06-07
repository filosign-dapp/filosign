/** Adapted from react-email demo 03-Protocol (MIT). */
import type { TailwindConfig } from "@react-email/components";
import plugin from "tailwindcss/plugin";
import { filosignEmailColors } from "../../../src/tokens";

const colors = {
	bg: "#1F2123",
	"bg-2": "#2A2C2E",
	fg: "#FFFFFF",
	"fg-2": "#C4C4C4",
	"fg-3": "#818181",
	"fg-inverted": "#FFFFFC",
	stroke: "#43454B",
	brand: filosignEmailColors.brand,
	surface: "#FFFFFF",
} as const;

const fontScale = {
	11: {
		fontSize: "11px",
		lineHeight: "1.5",
		letterSpacing: "0.3px",
		fontWeight: "300",
	},
	13: {
		fontSize: "13px",
		lineHeight: "1.5",
		letterSpacing: "0.2px",
		fontWeight: "300",
	},
	14: {
		fontSize: "14px",
		lineHeight: "1.5",
		letterSpacing: "0.3px",
		fontWeight: "350",
	},
	15: {
		fontSize: "15px",
		lineHeight: "1.5",
		letterSpacing: "-0.075px",
		fontWeight: "450",
	},
	20: { fontSize: "20px", lineHeight: "1.1", fontWeight: "500" },
	32: {
		fontSize: "32px",
		lineHeight: "0.9",
		letterSpacing: "0.4px",
		fontWeight: "500",
	},
	40: {
		fontSize: "40px",
		lineHeight: "1",
		letterSpacing: "-1.2px",
		fontWeight: "500",
	},
	56: {
		fontSize: "56px",
		lineHeight: "1",
		letterSpacing: "-1.68px",
		fontWeight: "500",
	},
} as const;

export const protocolTailwindConfig: TailwindConfig = {
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
				sans: ["Inter", "Arial", "sans-serif"],
				condensed: [
					"'IBM Plex Sans Condensed'",
					"'Arial Narrow'",
					"Arial",
					"sans-serif",
				],
			},
		},
	},
};
