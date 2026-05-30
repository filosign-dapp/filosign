import type { Hex } from "viem";
import {
	concatHex,
	encodePacked,
	keccak256,
	ripemd160,
	stringToBytes,
} from "viem";
import type { PlacementManifest } from "./placement-manifest";
import { normalizePlacementRecipientEmail } from "./placement-manifest";

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

/** Maps emails to commitments in input order (for sequential routingOrder). */
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
