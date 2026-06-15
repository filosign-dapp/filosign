import type { Address, Hex } from "viem";
import {
	concat,
	concatHex,
	encodeAbiParameters,
	encodePacked,
	hexToBigInt,
	isHex,
	keccak256,
	ripemd160,
	stringToBytes,
} from "viem";
import type { PlacementManifest } from "./placement";
import { normalizePlacementRecipientEmail } from "./placement";

// --- From auth-subject.ts ---
const AUTH_SUBJECT_PREFIX = "filosign:auth-subject:v1:" as const;

export function hashAuthSubjectCommitment(authProviderId: string): Hex {
	const d = authProviderId.trim();
	if (!d) throw new Error("authProviderId is required");
	return keccak256(stringToBytes(`${AUTH_SUBJECT_PREFIX}${d}`)) as Hex;
}

// --- From draft-crypto.ts ---
export function draftDekWrapOmkInfo(draftId: string): string {
	return `filosign:draft-dek-wrap:omk:v1:${draftId}`;
}

export function draftDekWrapUserInfo(draftId: string, wallet: string): string {
	return `filosign:draft-dek-wrap:user:v1:${draftId}:${wallet.toLowerCase()}`;
}

export function draftDekWrapExternalInfo(
	draftId: string,
	inviteToken: string,
): string {
	return `filosign:draft-dek-wrap:external:v1:${draftId}:${inviteToken}`;
}

export function draftSnapshotInfo(draftId: string): string {
	return `filosign:draft-snapshot:v1:${draftId}`;
}

export function draftDocumentInfo(draftId: string, docId: string): string {
	return `filosign:draft-document:v1:${draftId}:${docId}`;
}

export function templateDekWrapOmkInfo(templateId: string): string {
	return `filosign:template-dek-wrap:omk:v1:${templateId}`;
}

export function templateDocumentInfo(
	templateId: string,
	docId: string,
): string {
	return `filosign:template-document:v1:${templateId}:${docId}`;
}

export function draftCommentInfo(draftId: string, commentId: string): string {
	return `filosign:draft-comment:v1:${draftId}:${commentId}`;
}

export function fileCommentInfo(pieceCid: string, commentId: string): string {
	return `filosign:file-comment:v1:${pieceCid}:${commentId}`;
}

export function draftReviewLinkInfo(
	draftId: string,
	inviteToken: string,
): string {
	return `filosign:draft-review-link:v1:${draftId}:${inviteToken}`;
}

// --- From org-crypto.ts ---
export const ORG_OMK_WRAP_INFO = "filosign:org-omk-wrap:v1" as const;

// --- From org-commitment.ts ---
export const ZERO_ORG_ID_COMMITMENT =
	"0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export function hashOrgIdCommitment(organizationId: string): Hex {
	return keccak256(stringToBytes(organizationId));
}

// --- From file-audit.ts ---
export const FILE_ACK_INTENT_VERSION_V1 = "receive_and_review_v1" as const;
export type FileAckIntentVersion = typeof FILE_ACK_INTENT_VERSION_V1;

export const FILE_ACK_INTENT_LABELS: Record<FileAckIntentVersion, string> = {
	receive_and_review_v1:
		"I accept this document and agree to review it electronically before signing.",
};

export const documentViewSources = [
	"sign_page",
	"file_viewer",
	"inbox",
] as const;

export type DocumentViewSource = (typeof documentViewSources)[number];

export const SIGN_REVIEW_ATTESTATION_V1 =
	"I confirm I have carefully read and reviewed this document and its terms, and I intend to sign it. I understand Filosign does not determine legal suitability.";

export const SIGN_ESIGN_CONSENT_V1 =
	"By signing, I agree to use electronic records and signatures for this document.";

export const SIGN_CONFIRM_DESCRIPTION_V1 = `${SIGN_REVIEW_ATTESTATION_V1} ${SIGN_ESIGN_CONSENT_V1}`;

export function isValidAckSignature(ackHex: string): ackHex is Hex {
	return isHex(ackHex) && ackHex.length >= 130;
}

// --- From signer-email-commitment.ts ---
export function uniqueSignerEmailsFromManifest(
	manifest: PlacementManifest,
): string[] {
	const s = new Set<string>();
	for (const f of manifest.fields) s.add(f.assignedRecipientEmail);
	return [...s];
}

export function hashNormalizedSignerEmail(email: string): Hex {
	const n = normalizePlacementRecipientEmail(email);
	return keccak256(stringToBytes(`filosign:signer-email:v1:${n}`)) as Hex;
}

function sortBytes32Asc(ws: Hex[]): Hex[] {
	return [...ws].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function emailCommitRoot(sorted: Hex[]): Hex {
	if (!sorted.length) return "0x0000000000000000000000000000000000000000";
	return ripemd160(concatHex(sorted)) as Hex;
}

export function sortedCommitsForEmails(emails: Iterable<string>): Hex[] {
	const seen = new Set<string>();
	const list: string[] = [];
	for (const e of emails) {
		const n = normalizePlacementRecipientEmail(e);
		if (!seen.has(n)) {
			seen.add(n);
			list.push(n);
		}
	}
	return sortBytes32Asc(list.map(hashNormalizedSignerEmail));
}

export function commitsForEmails(emails: Iterable<string>): Hex[] {
	const seen = new Set<string>();
	const list: string[] = [];
	for (const e of emails) {
		const n = normalizePlacementRecipientEmail(e);
		if (!seen.has(n)) {
			seen.add(n);
			list.push(n);
		}
	}
	return list.map(hashNormalizedSignerEmail);
}

export function sortedSignerCommitsForManifest(
	manifest: PlacementManifest,
): Hex[] {
	return sortedCommitsForEmails(uniqueSignerEmailsFromManifest(manifest));
}

export function hashCommitmentsPacked(commitments: readonly Hex[]): Hex {
	if (commitments.length === 0) {
		return keccak256(new Uint8Array(0));
	}
	return keccak256(
		encodePacked(
			commitments.map(() => "bytes32" as const),
			[...commitments],
		),
	);
}

export function buildRegistrationEmailCommitments(args: {
	placementManifest: PlacementManifest;
	viewerEmails: string[];
}) {
	const requiredCommitments = sortedSignerCommitsForManifest(
		args.placementManifest,
	);
	const viewerEmailCommitmentsSorted = sortedCommitsForEmails(
		args.viewerEmails,
	);
	return {
		requiredCommitments,
		viewerEmailCommitmentsSorted,
		signersCommitment: emailCommitRoot(requiredCommitments),
		viewersCommitment: emailCommitRoot(viewerEmailCommitmentsSorted),
	};
}

// --- From completions-merkle.ts ---
export const LEAF_SCHEMA_VERSION_V1 = 1 as const;

export function fieldIdToBytes32(fieldId: string): Hex {
	return keccak256(stringToBytes(fieldId));
}

export function computeLeafHashV1(params: {
	fieldId: string;
	placementCommitment: Hex;
	pieceCid: string;
	signer: Address;
}): Hex {
	const pieceCidDigest = keccak256(stringToBytes(params.pieceCid));
	const fieldKey = fieldIdToBytes32(params.fieldId);
	const encoded = encodeAbiParameters(
		[
			{ type: "uint8", name: "leafSchemaVersion" },
			{ type: "bytes32", name: "fieldId" },
			{ type: "bytes32", name: "placementCommitment" },
			{ type: "bytes32", name: "pieceCidDigest" },
			{ type: "address", name: "signer" },
		],
		[
			LEAF_SCHEMA_VERSION_V1,
			fieldKey,
			params.placementCommitment,
			pieceCidDigest,
			params.signer,
		],
	);
	return keccak256(encoded);
}

function hashPair(a: Hex, b: Hex): Hex {
	const [left, right] = hexToBigInt(a) <= hexToBigInt(b) ? [a, b] : [b, a];
	return keccak256(concat([left as `0x${string}`, right as `0x${string}`]));
}

export function merkleRootFromLeaves(leafHashes: Hex[]): Hex {
	if (leafHashes.length === 0) {
		throw new Error("merkleRootFromLeaves: empty leaves");
	}
	let level = [...leafHashes];
	while (level.length > 1) {
		const next: Hex[] = [];
		for (let i = 0; i < level.length; i += 2) {
			const left = level[i];
			const right = level[i + 1] ?? left;
			if (!left || !right) break;
			next.push(hashPair(left, right));
		}
		level = next;
	}
	const root = level[0];
	if (!root) throw new Error("merkleRootFromLeaves: no root");
	return root;
}

export function completionsMerkleRootV1(params: {
	fieldIds: string[];
	placementCommitment: Hex;
	pieceCid: string;
	signer: Address;
}): Hex {
	const uniqueSorted = [...new Set(params.fieldIds)].sort((a, b) =>
		a.localeCompare(b),
	);
	const leaves = uniqueSorted.map((fieldId) =>
		computeLeafHashV1({
			fieldId,
			placementCommitment: params.placementCommitment,
			pieceCid: params.pieceCid,
			signer: params.signer,
		}),
	);
	return merkleRootFromLeaves(leaves);
}

export function merkleLevelsFromLeaves(leafHashes: Hex[]): Hex[][] {
	if (leafHashes.length === 0) {
		throw new Error("merkleLevelsFromLeaves: empty leaves");
	}
	const levels: Hex[][] = [];
	let level = [...leafHashes];
	levels.push(level);
	while (level.length > 1) {
		const next: Hex[] = [];
		for (let i = 0; i < level.length; i += 2) {
			const left = level[i];
			const right = level[i + 1] ?? left;
			if (!left || !right) break;
			next.push(hashPair(left, right));
		}
		level = next;
		levels.push(level);
	}
	return levels;
}

export function merkleInclusionSiblings(
	levels: Hex[][],
	leafIndex: number,
): Hex[] {
	const siblings: Hex[] = [];
	let index = leafIndex;
	for (let d = 0; d < levels.length - 1; d++) {
		const row = levels[d];
		if (!row) break;
		const pairBase = Math.floor(index / 2) * 2;
		const left = row[pairBase];
		const right = row[pairBase + 1] ?? left;
		const sibling = index === pairBase ? right : left;
		if (sibling !== undefined) siblings.push(sibling);
		index = Math.floor(index / 2);
	}
	return siblings;
}

export function merkleRootFromLeafAndSiblings(
	leafHash: Hex,
	siblings: Hex[],
): Hex {
	let cur = leafHash;
	for (const sib of siblings) {
		cur = hashPair(cur, sib);
	}
	return cur;
}

export type CompletionMerkleLeafProofV1 = {
	fieldId: string;
	leafHash: Hex;
	leafIndex: number;
	siblings: Hex[];
};

export function completionsMerkleProofsV1(params: {
	fieldIds: string[];
	placementCommitment: Hex;
	pieceCid: string;
	signer: Address;
}): CompletionMerkleLeafProofV1[] {
	const uniqueSorted = [...new Set(params.fieldIds)].sort((a, b) =>
		a.localeCompare(b),
	);
	const leaves = uniqueSorted.map((fieldId) =>
		computeLeafHashV1({
			fieldId,
			placementCommitment: params.placementCommitment,
			pieceCid: params.pieceCid,
			signer: params.signer,
		}),
	);
	const levels = merkleLevelsFromLeaves(leaves);
	return uniqueSorted.map((fieldId, leafIndex) => ({
		fieldId,
		leafHash: leaves[leafIndex] as Hex,
		leafIndex,
		siblings: merkleInclusionSiblings(levels, leafIndex),
	}));
}
