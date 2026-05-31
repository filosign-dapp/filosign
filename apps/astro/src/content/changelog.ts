export type ChangeType = "Feature" | "Enhancement" | "Fix";

export type ChangelogEntry = {
	id: string;
	date: string;
	type: ChangeType;
	title: string;
	description: string[];
	image?: string;
};

/** Newest first (top → bottom). Scroll down for the build story from sign-in upward. */
export const ChangelogEntries: ChangelogEntry[] = [
	{
		id: "15",
		date: "May 27, 2026",
		type: "Feature",
		title: "Save drafts before you send",
		description: [
			"Pause mid-envelope and pick up recipients and field placement later. Nothing lost when you're not ready to send.",
		],
	},
	{
		id: "14",
		date: "May 18, 2026",
		type: "Feature",
		title: "Attached payouts",
		description: [
			"Attach a payout to a document so payment releases when signing completes. Funds move directly between payer and recipient, and Filosign never holds your money.",
		],
	},
	{
		id: "13",
		date: "May 10, 2026",
		type: "Feature",
		title: "Team workspaces",
		description: [
			"Share documents, members, and templates in one workspace instead of juggling personal inboxes.",
		],
	},
	{
		id: "12",
		date: "Apr 29, 2026",
		type: "Feature",
		title: "Introducing Filosign",
		description: [
			"Encrypted agreements with verifiable signing records, built so you control your files and your proof.",
		],
	},
	{
		id: "11",
		date: "Apr 22, 2026",
		type: "Feature",
		title: "Field-level signing proof you can export",
		description: [
			"See which fields each person signed and export a proof package for counsel, auditors, or counterparties. Stronger audit trails when you need field-by-field evidence.",
		],
	},
	{
		id: "10",
		date: "Apr 10, 2026",
		type: "Enhancement",
		title: "Proof packets and mobile signing",
		description: [
			"Download a proof packet PDF for compliance review and sign from your phone browser. No native app required.",
		],
	},
	{
		id: "9",
		date: "Mar 28, 2026",
		type: "Feature",
		title: "Sign from an email link",
		description: [
			"Recipients open a secure link, set up once, and sign without digging through email threads.",
		],
	},
	{
		id: "8",
		date: "Mar 15, 2026",
		type: "Feature",
		title: "Place signature fields on the page",
		description: [
			"Drag signature, date, and text fields onto the PDF so every signer knows exactly where to sign.",
		],
	},
	{
		id: "7",
		date: "Feb 13, 2026",
		type: "Enhancement",
		title: "No gas fees for signing",
		description: [
			"Register, send, and sign without buying ETH first. Onboarding feels like a normal web app.",
		],
	},
	{
		id: "6",
		date: "Nov 3, 2025",
		type: "Enhancement",
		title: "Contact approvals",
		description: [
			"Approve senders before they can reach you; documents stay encrypted end-to-end for people you allow in.",
		],
	},
	{
		id: "5",
		date: "Oct 25, 2025",
		type: "Feature",
		title: "User profiles",
		description: [
			"Add a username, display name, and avatar so collaborators recognize you in signing and sharing flows.",
		],
	},
	{
		id: "4",
		date: "Oct 12, 2025",
		type: "Feature",
		title: "Signature styles and long-term proof",
		description: [
			"Draw, type, or upload signatures and reuse them from your library, with records built for long-term verification.",
		],
	},
	{
		id: "3",
		date: "Oct 4, 2025",
		type: "Feature",
		title: "Send and sign your first document",
		description: [
			"Create an envelope, add recipients, and complete signing. The core flow everything else builds on.",
		],
	},
	{
		id: "2",
		date: "Sep 20, 2025",
		type: "Feature",
		title: "Encrypted document upload",
		description: [
			"Upload PDFs encrypted end-to-end. Only you and your recipients can read them.",
		],
	},
	{
		id: "1",
		date: "Sep 6, 2025",
		type: "Feature",
		title: "Sign in with Google or your wallet",
		description: [
			"Get started with Google or connect a wallet. One sign-in, then straight into sending or signing.",
		],
	},
];
