// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import remarkGfm from "remark-gfm";

const site =
	(typeof process !== "undefined" && process.env.PUBLIC_ASTRO_URL) ||
	"https://filosign.xyz";

// https://astro.build/config
export default defineConfig({
	site,
	redirects: {
		"/docs/stablecoin-payouts": "/docs/workflows/payouts",
	},
	integrations: [
		starlight({
			title: "Filosign Docs",
			description:
				"Step-by-step guides for agreement workflows, USDC payouts, attached files, drafts, templates, and troubleshooting.",
			customCss: ["./src/styles/docs.css"],
			sidebar: [
				{ label: "Home", link: "/docs/" },
				{
					label: "Workflows",
					items: [
						{ label: "Overview", link: "/docs/workflows/" },
						{ label: "Stablecoin Payouts", link: "/docs/workflows/payouts/" },
						{
							label: "Attached files",
							link: "/docs/workflows/attached-files/",
						},
						{
							label: "Release conditions",
							link: "/docs/workflows/release-conditions/",
						},
						{ label: "Drafts", link: "/docs/workflows/drafts/" },
						{ label: "Templates", link: "/docs/workflows/templates/" },
					],
				},
				{ label: "Troubleshooting", link: "/docs/troubleshooting/" },
			],
		}),
		react(),
		mdx({
			remarkPlugins: [remarkGfm],
		}),
		sitemap({
			filter: (page) => !page.includes("/open-graph/"),
		}),
	],
	vite: {
		resolve: {
			dedupe: ["react", "react-dom"],
		},
		optimizeDeps: {
			include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
		},
	},
	server: {
		port: 3002,
	},
});
