/** Adapted from react-email demo 01-Barebone (MIT). */
import type { TailwindConfig } from "@react-email/components";
import plugin from "tailwindcss/plugin";
import { filosignEmailColors } from "../../../src/tokens";

const fontScale = {
	11: {
		fontSize: "11px",
		fontWeight: "420",
		letterSpacing: "-0.033px",
		lineHeight: "1.5",
	},
	13: {
		fontSize: "13px",
		fontWeight: "420",
		letterSpacing: "-0.039px",
		lineHeight: "1.5",
	},
	14: { fontSize: "14px", fontWeight: "450", lineHeight: "1.5" },
	16: {
		fontSize: "16px",
		fontWeight: "420",
		letterSpacing: "-0.048px",
		lineHeight: "1.5",
	},
	24: {
		fontSize: "24px",
		fontWeight: "600",
		letterSpacing: "-0.084px",
		lineHeight: "1",
	},
	28: {
		fontSize: "28px",
		fontWeight: "600",
		letterSpacing: "-0.084px",
		lineHeight: "1.3",
	},
	32: {
		fontSize: "32px",
		fontWeight: "600",
		letterSpacing: "-0.64px",
		lineHeight: "1.25",
	},
	40: {
		fontSize: "40px",
		fontWeight: "600",
		letterSpacing: "-0.8px",
		lineHeight: "1.1",
	},
} as const;

export const bareboneTailwindConfig: TailwindConfig = {
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
			colors: filosignEmailColors,
			fontFamily: {
				sans: ["Inter", "system-ui", "Arial", "sans-serif"],
			},
		},
	},
};
