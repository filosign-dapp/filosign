export type ChangeType = "Feature" | "Enhancement" | "Fix";

export type ChangelogCategory =
	| "Signing"
	| "Proof"
	| "Teams"
	| "Payouts"
	| "Workflow"
	| "Plans"
	| "Privacy";

/** Internal era keys for grouping and navigation. */
export type ChangelogEra = "foundation" | "core" | "platform" | "acceleration";

export type ChangelogEntry = {
	id: string;
	date: string;
	type: ChangeType;
	category: ChangelogCategory;
	era: ChangelogEra;
	title: string;
	description: string[];
	image?: string;
	treeHighlight?: boolean;
};

export const CHANGELOG_CATEGORY_LABELS: Record<ChangelogCategory, string> = {
	Signing: "Signing",
	Proof: "Proof & records",
	Teams: "Teams",
	Payouts: "Payouts",
	Workflow: "Workflow",
	Plans: "Plans & billing",
	Privacy: "Privacy",
};

export const CHANGELOG_ERAS: ReadonlyArray<{
	id: ChangelogEra;
	label: string;
	subtitle: string;
	description: string;
}> = [
	{
		id: "acceleration",
		label: "Shipping faster",
		subtitle: "June 2026",
		description:
			"Plans, onboarding, team invites, and polish - a steady run of improvements for growing teams.",
	},
	{
		id: "platform",
		label: "Ready for teams",
		subtitle: "Late May 2026",
		description:
			"Workspaces, payout packets, and drafts so agreements do not stop at the signature.",
	},
	{
		id: "core",
		label: "Everyday workflow",
		subtitle: "Early May 2026",
		description:
			"Proof you can share, signing from email, and field placement that feels familiar.",
	},
	{
		id: "foundation",
		label: "Where it started",
		subtitle: "Mid Apr 2026",
		description:
			"Private documents, a first send-and-sign loop, and profiles your teammates recognize.",
	},
] as const;

/** Newest first (top → bottom). Scroll down for the full build story. */
export const ChangelogEntries: ChangelogEntry[] = [
	{
		id: "29",
		date: "Jun 15, 2026",
		type: "Feature",
		category: "Plans",
		era: "acceleration",
		title: "Bill the team, not just yourself",
		description: [
			"Spin up a workspace, pick a plan, and checkout in one flow. Subscriptions follow the team that actually uses Filosign.",
		],
		treeHighlight: true,
	},
	{
		id: "28",
		date: "Jun 14, 2026",
		type: "Feature",
		category: "Workflow",
		era: "acceleration",
		title: "See what's included before you upgrade",
		description: [
			"Payouts, file handoffs, signing order, and templates stay visible in the product. When something needs a higher plan, you know upfront - no surprises mid-send.",
		],
	},
	{
		id: "27",
		date: "Jun 13, 2026",
		type: "Feature",
		category: "Workflow",
		era: "acceleration",
		title: "Tell us what to build next",
		description: [
			"Leave feedback from the screens you use every day. We read it and use it to decide what ships next.",
		],
	},
	{
		id: "26",
		date: "Jun 12, 2026",
		type: "Feature",
		category: "Privacy",
		era: "acceleration",
		title: "You choose what we measure",
		description: [
			"Turn usage analytics on or off in your profile. Your choice applies across the app.",
		],
	},
	{
		id: "25",
		date: "Jun 11, 2026",
		type: "Feature",
		category: "Signing",
		era: "acceleration",
		title: "Know where your send stands",
		description: [
			"Watch your envelope move from prep to delivery with plain-language updates - so nobody wonders if it went through.",
		],
		treeHighlight: true,
	},
	{
		id: "24",
		date: "Jun 10, 2026",
		type: "Enhancement",
		category: "Workflow",
		era: "acceleration",
		title: "Get to your first send faster",
		description: [
			"Set your name once, land in the right place after sign-in, and skip the detours that slow new teammates down.",
		],
	},
	{
		id: "23",
		date: "Jun 9, 2026",
		type: "Feature",
		category: "Workflow",
		era: "acceleration",
		title: "A guided start for new teammates",
		description: [
			"Short tutorials walk you through proof exports and your first send - so nobody stares at an empty dashboard wondering what to do.",
		],
	},
	{
		id: "22",
		date: "Jun 8, 2026",
		type: "Feature",
		category: "Teams",
		era: "acceleration",
		title: "Invite partners with a Teams Pro trial",
		description: [
			"Send branded invites that unlock a trial when someone joins. They get a clear welcome on day one.",
		],
		treeHighlight: true,
	},
	{
		id: "21",
		date: "Jun 6, 2026",
		type: "Enhancement",
		category: "Workflow",
		era: "acceleration",
		title: "Pages that feel instant",
		description: [
			"Sign, drafts, and your document list load with clear placeholders instead of blank screens while content arrives.",
		],
	},
	{
		id: "20",
		date: "Jun 5, 2026",
		type: "Enhancement",
		category: "Signing",
		era: "acceleration",
		title: "Find any document in seconds",
		description: [
			"Your document list shows status at a glance - waiting, in progress, done - so you know what needs action.",
		],
	},
	{
		id: "19",
		date: "Jun 4, 2026",
		type: "Enhancement",
		category: "Workflow",
		era: "acceleration",
		title: "One consistent experience across flows",
		description: [
			"Billing, sharing, and workspace setup now look and feel the same - fewer one-off pop-ups to figure out.",
		],
	},
	{
		id: "18",
		date: "Jun 2, 2026",
		type: "Feature",
		category: "Payouts",
		era: "acceleration",
		title: "Release files to the right people only",
		description: [
			"Attach deliverables that unlock only for the signers you choose - so handoffs stay controlled.",
		],
	},
	{
		id: "17",
		date: "Jun 1, 2026",
		type: "Feature",
		category: "Proof",
		era: "acceleration",
		title: "Keep records longer, without extra work",
		description: [
			"Optional long-term backup for agreements and proof when your retention needs outgrow everyday storage.",
		],
	},
	{
		id: "16",
		date: "May 30, 2026",
		type: "Feature",
		category: "Plans",
		era: "acceleration",
		title: "Pick a plan without leaving Filosign",
		description: [
			"Compare plans and subscribe inside the app. Your workspace billing stays in one place.",
		],
	},
	{
		id: "15",
		date: "May 27, 2026",
		type: "Feature",
		category: "Signing",
		era: "platform",
		title: "Save drafts before you send",
		description: [
			"Pause mid-envelope and pick up recipients and field placement later. Nothing lost when you are not ready to send.",
		],
		treeHighlight: true,
	},
	{
		id: "14",
		date: "May 24, 2026",
		type: "Feature",
		category: "Payouts",
		era: "platform",
		title: "Payout packets",
		description: [
			"Attach approved payments to an agreement so funds can move when signing is complete. Money goes directly between payer and recipient - Filosign never holds it.",
		],
		treeHighlight: true,
	},
	{
		id: "13",
		date: "May 21, 2026",
		type: "Feature",
		category: "Teams",
		era: "platform",
		title: "Team workspaces",
		description: [
			"Share documents, members, and templates in one workspace instead of juggling personal inboxes.",
		],
		treeHighlight: true,
	},
	{
		id: "12",
		date: "May 18, 2026",
		type: "Feature",
		category: "Workflow",
		era: "platform",
		title: "Filosign is live",
		description: [
			"Private agreements with records you can verify and export - built so you control your files and your proof.",
		],
		treeHighlight: true,
	},
	{
		id: "11",
		date: "May 14, 2026",
		type: "Feature",
		category: "Proof",
		era: "core",
		title: "Proof you can hand to finance or legal",
		description: [
			"See exactly which fields each person signed and export a packet for counsel, finance, or a counterparty.",
		],
		treeHighlight: true,
	},
	{
		id: "10",
		date: "May 10, 2026",
		type: "Enhancement",
		category: "Proof",
		era: "core",
		title: "Sign from your phone, export proof from your desk",
		description: [
			"Recipients sign in the mobile browser. You download a proof packet PDF when you need a clean record.",
		],
	},
	{
		id: "9",
		date: "May 7, 2026",
		type: "Feature",
		category: "Signing",
		era: "core",
		title: "Sign from an email link",
		description: [
			"Recipients open a secure link, set up once, and sign without digging through email threads.",
		],
	},
	{
		id: "8",
		date: "May 4, 2026",
		type: "Feature",
		category: "Signing",
		era: "core",
		title: "Place fields where people should sign",
		description: [
			"Drop signature, date, and text fields onto the PDF so every signer knows exactly where to complete the agreement.",
		],
	},
	{
		id: "7",
		date: "May 1, 2026",
		type: "Enhancement",
		category: "Signing",
		era: "core",
		title: "Send and sign without extra setup",
		description: [
			"Create an account, send an envelope, and sign in a flow that feels like the business apps you already use. No specialist tools required.",
		],
	},
	{
		id: "6",
		date: "Apr 28, 2026",
		type: "Enhancement",
		category: "Workflow",
		era: "core",
		title: "You approve who can send to you",
		description: [
			"Block surprise requests. Only people you allow can route documents to your inbox - and everything stays encrypted.",
		],
	},
	{
		id: "5",
		date: "Apr 25, 2026",
		type: "Feature",
		category: "Workflow",
		era: "foundation",
		title: "Profiles your teammates recognize",
		description: [
			"Add a display name and avatar so collaborators know who they are signing with.",
		],
	},
	{
		id: "4",
		date: "Apr 22, 2026",
		type: "Feature",
		category: "Signing",
		era: "foundation",
		title: "Signatures you can reuse",
		description: [
			"Draw, type, or upload once and pull from your library next time - with records built to hold up over time.",
		],
	},
	{
		id: "3",
		date: "Apr 19, 2026",
		type: "Feature",
		category: "Signing",
		era: "foundation",
		title: "Send and sign your first document",
		description: [
			"Create an envelope, add recipients, and finish signing. The loop every other feature builds on.",
		],
		treeHighlight: true,
	},
	{
		id: "2",
		date: "Apr 16, 2026",
		type: "Feature",
		category: "Signing",
		era: "foundation",
		title: "Documents that stay private",
		description: [
			"Upload PDFs encrypted before they leave your browser. Only you and your recipients can read them.",
		],
		treeHighlight: true,
	},
	{
		id: "1",
		date: "Apr 14, 2026",
		type: "Feature",
		category: "Workflow",
		era: "foundation",
		title: "Sign in and get to work",
		description: [
			"Sign in with Google and go straight to sending or signing. One account, one place to run your agreements.",
		],
		treeHighlight: true,
	},
];

export function changelogStats(entries: ChangelogEntry[]) {
	const recent = entries.filter((entry) => {
		const month = entry.date.slice(0, 3);
		return month === "May" || month === "Jun";
	}).length;
	const priorMonth = entries.filter((entry) =>
		entry.date.includes("Apr"),
	).length;

	return { priorMonth, recent, total: entries.length };
}

export function groupEntriesByEra(
	entries: ChangelogEntry[],
): Map<ChangelogEra, ChangelogEntry[]> {
	const grouped = new Map<ChangelogEra, ChangelogEntry[]>();
	for (const era of CHANGELOG_ERAS) {
		grouped.set(
			era.id,
			entries.filter((entry) => entry.era === era.id),
		);
	}
	return grouped;
}
