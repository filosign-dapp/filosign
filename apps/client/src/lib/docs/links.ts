import { env } from "@/src/env";

function docsBase(): string {
	return `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/docs`;
}

export const DOCS_LINKS = {
	home: () => docsBase(),
	workflows: () => `${docsBase()}/workflows`,
	signingAndRouting: () => `${docsBase()}/workflows/signing-and-routing`,
	envelopeGovernance: () => `${docsBase()}/workflows/envelope-governance`,
	comments: () => `${docsBase()}/workflows/comments`,
	payouts: () => `${docsBase()}/workflows/payouts`,
	attachedFiles: () => `${docsBase()}/workflows/attached-files`,
	releaseConditions: () => `${docsBase()}/workflows/release-conditions`,
	drafts: () => `${docsBase()}/workflows/drafts`,
	templates: () => `${docsBase()}/workflows/templates`,
	/** @deprecated Use `payouts()` */
	stablecoinPayouts: () => `${docsBase()}/workflows/payouts`,
	workspace: () => `${docsBase()}/workspace`,
	membersAndRoles: () => `${docsBase()}/workspace/members-and-roles`,
	billingAndSeats: () => `${docsBase()}/workspace/billing-and-seats`,
	treasuryWallet: () => `${docsBase()}/workspace/treasury-wallet`,
	payoutAccess: () => `${docsBase()}/workspace/payout-access`,
	connections: () => `${docsBase()}/workspace/connections`,
	encryptedWorkflows: () => `${docsBase()}/security/encrypted-workflows`,
	whatWeCanSee: () => `${docsBase()}/security/what-we-can-see`,
	onChainRecord: () => `${docsBase()}/security/on-chain-record`,
	eSignatureEvidence: () => `${docsBase()}/proof/e-signature-evidence`,
	completionPacket: () => `${docsBase()}/proof/completion-packet`,
	readComplianceReport: () => `${docsBase()}/proof/read-compliance-report`,
	signatureLibrary: () => `${docsBase()}/proof/signature-library`,
	storageRetention: () => `${docsBase()}/storage/how-retention-works`,
	exportBeforeArchival: () => `${docsBase()}/storage/export-before-archival`,
	storageStatus: () => `${docsBase()}/storage/status-in-app`,
	plans: () => `${docsBase()}/plans`,
	roadmap: () => `${docsBase()}/plans/roadmap`,
	troubleshooting: (slug?: string) =>
		slug
			? `${docsBase()}/troubleshooting#${slug}`
			: `${docsBase()}/troubleshooting`,
} as const;
