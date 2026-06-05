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
			title: "filosign",
			description:
				"Plain-language guides for private agreement workflows: send documents, collect signatures, export proof, and release payouts or files when signing conditions are met.",
			customCss: ["./src/styles/docs.css"],
			sidebar: [
				{ label: "Home", link: "/docs/" },
				{
					label: "Agreement workflows",
					items: [
						{ label: "Overview", link: "/docs/workflows/" },
						{
							label: "Signing and routing",
							link: "/docs/workflows/signing-and-routing/",
						},
						{
							label: "Void or change an envelope",
							link: "/docs/workflows/envelope-governance/",
						},
						{ label: "Comments", link: "/docs/workflows/comments/" },
						{ label: "Payout packets", link: "/docs/workflows/payouts/" },
						{
							label: "Gated file release",
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
				{
					label: "Proof and evidence",
					items: [
						{
							label: "Proof packets",
							link: "/docs/proof/completion-packet/",
						},
						{
							label: "How to read the proof report",
							link: "/docs/proof/read-compliance-report/",
						},
						{
							label: "E-signature evidence",
							link: "/docs/proof/e-signature-evidence/",
						},
						{
							label: "Signature library",
							link: "/docs/proof/signature-library/",
						},
					],
				},
				{
					label: "Security and privacy",
					items: [
						{
							label: "Document privacy",
							link: "/docs/security/encrypted-workflows/",
						},
						{
							label: "What Filosign can see",
							link: "/docs/security/what-we-can-see/",
						},
						{
							label: "Verification records",
							link: "/docs/security/on-chain-record/",
						},
						{
							label: "Keeping documents long term",
							link: "/docs/storage/how-retention-works/",
						},
						{
							label: "Download your own copy",
							link: "/docs/storage/export-before-archival/",
						},
						{
							label: "Storage status in the app",
							link: "/docs/storage/status-in-app/",
						},
					],
				},
				{
					label: "Teams and plans",
					items: [
						{ label: "Workspace overview", link: "/docs/workspace/" },
						{
							label: "Members and roles",
							link: "/docs/workspace/members-and-roles/",
						},
						{
							label: "Billing and seats",
							link: "/docs/workspace/billing-and-seats/",
						},
						{
							label: "Treasury wallet",
							link: "/docs/workspace/treasury-wallet/",
						},
						{
							label: "Payout access",
							link: "/docs/workspace/payout-access/",
						},
						{ label: "Connections", link: "/docs/workspace/connections/" },
						{ label: "Plans and limits", link: "/docs/plans/" },
						{ label: "Roadmap", link: "/docs/plans/roadmap/" },
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
