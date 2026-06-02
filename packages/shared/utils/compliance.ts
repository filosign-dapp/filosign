import z from "zod";
import { zEvmAddress, zHexString } from "../helpers/zod";
import { zPlacementManifest } from "./placement";
import {
	settlementReleaseTypes,
	settlementRuleStatuses,
} from "./settlement-rules";

// --- From compliance-bundle.ts ---
export const zMerkleLeafProof = z.object({
	fieldId: z.string(),
	leafHash: zHexString(),
	leafIndex: z.number().int().min(0),
	siblings: z.array(zHexString()),
});

export const zSignerComplianceRow = z.object({
	wallet: zEvmAddress(),
	displayName: z.string().nullable(),
	email: z.string().nullable(),
	signed: z.boolean(),
	assignedFieldIds: z.array(z.string()),
	requiredFieldIds: z.array(z.string()),
	optionalFieldIds: z.array(z.string()),
	onchainTxHash: zHexString().nullable(),
	signedAtIso: z.string().nullable(),
	completedFieldIds: z.array(z.string()),
	completionsRoot: zHexString().nullable(),
	leafSchemaVersion: z.number().int().nullable(),
	merkleProofs: z.array(zMerkleLeafProof),
	draftCompletedFieldIds: z.array(z.string()),
	messageTimestampIso: z.string().nullable(),
	blockTimestampFromTx: z.number().int().nonnegative().nullable(),
	acknowledgedAtIso: z.string().nullable(),
	firstViewedAtIso: z.string().nullable(),
});

export const zPartyRole = z.enum(["sender", "signer", "viewer"]);

export const zPartyRow = z.object({
	role: zPartyRole,
	wallet: zEvmAddress(),
	email: z.string(),
	displayName: z.string().nullable(),
	emailCommitment: zHexString(),
	authSubjectCommitment: zHexString().nullable(),
});

export const zOnchainRegistrationSnapshot = z.object({
	cidIdentifier: zHexString(),
	sender: zEvmAddress(),
	signersCommitment: zHexString(),
	viewersCommitment: zHexString(),
	placementCommitment: zHexString(),
	senderEmailCommitment: zHexString(),
	senderAuthSubjectCommitment: zHexString(),
	requiredSignersCount: z.number().int().min(0).max(255),
	requiredSignaturesCount: z.number().int().min(0).max(255),
	optionalSignersCount: z.number().int().min(0).max(255),
	optionalSignaturesCount: z.number().int().min(0).max(255),
	signersCount: z.number().int().min(0).max(255),
	signaturesCount: z.number().int().min(0).max(255),
	quorumN: z.number().int().min(0).max(255),
	routingMode: z.number().int().min(0).max(255),
	allRequiredSigned: z.boolean(),
	allSigned: z.boolean(),
	quorumMet: z.boolean(),
	rosterSignedCount: z.number().int().min(0).max(255),
	timestamp: z.string(),
});

export const zChainTxKind = z.enum([
	"file_registered",
	"file_signed",
	"signer_amended",
	"payout_executed",
]);

export const zSettlementComplianceRow = z.object({
	onChainRuleId: z.string(),
	legs: z.array(
		z.object({
			recipientWallet: zEvmAddress(),
			amount: z.string(),
		}),
	),
	tokenAddress: zEvmAddress(),
	releaseType: z.enum(settlementReleaseTypes),
	status: z.enum(settlementRuleStatuses),
	registerRuleTxHash: zHexString(),
	approveTxHash: zHexString(),
	payoutTxHash: zHexString().nullable(),
	executedAtIso: z.string().nullable(),
	lastError: z.string().nullable(),
});

export const COMPLIANCE_CHAIN_TX_KINDS = zChainTxKind.options;

export const zChainTxRef = z.object({
	kind: zChainTxKind,
	txHash: zHexString(),
	chainId: z.number().int(),
	contractAddress: zEvmAddress(),
	summary: z.string(),
	relatedAddresses: z.array(zEvmAddress()),
	blockNumber: z.number().int().nonnegative().nullable(),
	timestamp: z.number().int().nonnegative().nullable(),
	fetchedAtIso: z.string().nullable(),
});

export const zAckEvidenceRow = z.object({
	wallet: zEvmAddress(),
	createdAtIso: z.string(),
	acknowledgedAtIso: z.string(),
	intentVersion: z.string(),
	emailCommitment: zHexString(),
	authSubjectCommitment: zHexString().nullable(),
	ackSha256: zHexString().nullable(),
});

export const zDocumentViewRow = z.object({
	wallet: zEvmAddress(),
	firstViewedAtIso: z.string(),
	source: z.enum(["sign_page", "file_viewer", "inbox"]),
});

export const zColdInviteClaimRow = z.object({
	email: z.string(),
	wallet: zEvmAddress(),
	claimedAtIso: z.string(),
	isSigner: z.boolean(),
});

export const zSettlementRecipientAckRow = z.object({
	signerWallet: zEvmAddress(),
	termsVersion: z.string(),
	acknowledgedAtIso: z.string(),
});

export const zOffChainEvidence = z.object({
	acknowledgements: z.array(zAckEvidenceRow),
	documentViews: z.array(zDocumentViewRow),
	coldInviteClaims: z.array(zColdInviteClaimRow),
	payoutRecipientAcknowledgements: z.array(zSettlementRecipientAckRow),
});

export const zComplianceBundle = z.object({
	version: z.literal(7),
	pieceCid: z.string(),
	chainId: z.number().int(),
	exportedAtIso: z.string(),
	executionStatus: z.enum(["fully_executed", "partially_executed"]),
	placementCommitment: zHexString(),
	placementManifest: zPlacementManifest,
	registration: z.object({
		sender: zEvmAddress(),
		registrationTxHash: zHexString(),
		createdAtIso: z.string(),
	}),
	parties: z.array(zPartyRow),
	onchainRegistration: zOnchainRegistrationSnapshot.nullable(),
	transactions: z.array(zChainTxRef),
	signers: z.array(zSignerComplianceRow),
	settlements: z.array(zSettlementComplianceRow),
	offChainEvidence: zOffChainEvidence,
});

export type ComplianceBundle = z.infer<typeof zComplianceBundle>;
export type SettlementComplianceRow = z.infer<typeof zSettlementComplianceRow>;
export type SignerComplianceRow = z.infer<typeof zSignerComplianceRow>;
export type MerkleLeafProof = z.infer<typeof zMerkleLeafProof>;
export type PartyRow = z.infer<typeof zPartyRow>;
export type ChainTxRef = z.infer<typeof zChainTxRef>;

function sortKeysDeep(value: unknown): unknown {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep);
	}
	const obj = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) {
		sorted[key] = sortKeysDeep(obj[key]);
	}
	return sorted;
}

export function canonicalComplianceBundleJson(
	bundle: ComplianceBundle,
): string {
	const sorted = sortKeysDeep(bundle) as ComplianceBundle;
	return JSON.stringify(sorted);
}

// --- From analytics-scrub.ts ---
export type AnalyticsPropertyValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| AnalyticsPropertyValue[]
	| { [key: string]: AnalyticsPropertyValue };

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const EMAIL_EMBEDDED_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const HEX_64_RE = /^0x[0-9a-fA-F]{64}$/;

const SENSITIVE_PROPERTY_KEYS = new Set([
	"ciphertext",
	"encryptionPublicKey",
	"mnemonic",
	"passphrase",
	"privateKey",
	"secret",
	"dek",
	"kemCiphertext",
	"senderEncryptedEncryptionKey",
	"orgEncryptedEncryptionKey",
]);

const SENSITIVE_KEY_SUBSTRINGS = [
	"secret",
	"private",
	"token",
	"password",
	"apikey",
	"api_key",
	"auth",
	"session",
	"cookie",
	"cipher",
	"kem",
	"encrypted",
	"signature",
];

export function scrubAnalyticsString(value: string): string {
	const trimmed = value.trim();
	if (EMAIL_RE.test(trimmed)) return "[email redacted]";
	if (value.match(EMAIL_EMBEDDED_RE)) {
		return value.replace(EMAIL_EMBEDDED_RE, "[email redacted]");
	}
	if (HEX_64_RE.test(trimmed)) return "[hex redacted]";
	if (trimmed.length > 200 && /^[A-Za-z0-9+/=_-]+$/.test(trimmed)) {
		return "[blob redacted]";
	}
	return value;
}

function scrubAnalyticsValue(value: unknown): AnalyticsPropertyValue {
	if (typeof value === "string") return scrubAnalyticsString(value);
	if (Array.isArray(value)) {
		return value.map((item) => scrubAnalyticsValue(item));
	}
	if (typeof value === "object" && value !== null) {
		return scrubAnalyticsProperties(value as Record<string, unknown>);
	}
	if (
		typeof value === "number" ||
		typeof value === "boolean" ||
		value === null ||
		value === undefined
	) {
		return value;
	}
	return String(value);
}

export function scrubAnalyticsProperties(
	properties: Record<string, unknown>,
): AnalyticsProperties {
	const out: AnalyticsProperties = {};
	for (const [key, value] of Object.entries(properties)) {
		const keyLower = key.toLowerCase();
		if (
			SENSITIVE_PROPERTY_KEYS.has(key) ||
			SENSITIVE_KEY_SUBSTRINGS.some((part) => keyLower.includes(part))
		) {
			out[key] = "[redacted]";
			continue;
		}
		out[key] = scrubAnalyticsValue(value);
	}
	return out;
}

export type ScrubbableCaptureEvent = {
	properties?: AnalyticsProperties;
};

export function scrubCaptureEvent<T extends ScrubbableCaptureEvent>(
	event: T | null,
): T | null {
	if (!event?.properties) return event;
	return {
		...event,
		properties: scrubAnalyticsProperties(event.properties),
	};
}

export const scrubPostHogBeforeSend = scrubCaptureEvent;
