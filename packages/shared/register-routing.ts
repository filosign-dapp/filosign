import type { Hex } from "viem";
import z from "zod";
import type { PlacementManifest } from "./placement-manifest";
import {
	commitsForEmails,
	emailCommitRoot,
	sortedCommitsForEmails,
	sortedSignerCommitsForManifest,
} from "./signer-email-commitment";

export type RegisterRoutingInput = {
	optionalSignerEmails?: string[];
	routingMode?: 0 | 1;
	routingOrderEmails?: string[];
	quorumN?: number;
	quorumSetEmails?: string[];
};

export const zRegisterRoutingInput = z.object({
	optionalSignerEmails: z.array(z.string().email()).optional(),
	routingMode: z.union([z.literal(0), z.literal(1)]).optional(),
	routingOrderEmails: z.array(z.string().email()).optional(),
	quorumN: z.number().int().min(0).max(255).optional(),
	quorumSetEmails: z.array(z.string().email()).optional(),
});

export type RegisterRoutingCalldata = {
	requiredCommitments: Hex[];
	optionalCommitments: Hex[];
	routingMode: 0 | 1;
	routingOrder: Hex[];
	quorumN: number;
	quorumSet: Hex[];
};

export function usesAdvancedRegisterRouting(
	routing: RegisterRoutingInput | undefined,
): boolean {
	if (!routing) return false;
	if (routing.optionalSignerEmails?.length) return true;
	if (routing.routingMode === 1) return true;
	if (routing.routingOrderEmails?.length) return true;
	if ((routing.quorumN ?? 0) > 0) return true;
	if (routing.quorumSetEmails?.length) return true;
	return false;
}

/** Merge two sorted commitment arrays (required + optional roster). */
export function mergeSortedCommitments(
	required: readonly Hex[],
	optional: readonly Hex[],
): Hex[] {
	const merged: Hex[] = [];
	let i = 0;
	let j = 0;
	while (i < required.length && j < optional.length) {
		const req = required[i];
		const opt = optional[j];
		if (req === undefined || opt === undefined) break;
		if (req < opt) {
			merged.push(req);
			i++;
		} else {
			merged.push(opt);
			j++;
		}
	}
	while (i < required.length) {
		const req = required[i];
		if (req === undefined) break;
		merged.push(req);
		i++;
	}
	while (j < optional.length) {
		const opt = optional[j];
		if (opt === undefined) break;
		merged.push(opt);
		j++;
	}
	return merged;
}

function normalizeEmails(emails: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const email of emails) {
		const n = email.trim().toLowerCase();
		if (!n || seen.has(n)) continue;
		seen.add(n);
		out.push(n);
	}
	return out;
}

/** Required signer commitments for register (manifest roster minus optional routing). */
export function requiredSignerCommitsForRegister(args: {
	placementManifest: PlacementManifest;
	routing?: RegisterRoutingInput;
}): Hex[] {
	return buildRegisterRoutingCalldata(args).requiredCommitments;
}

/** Validate routing calldata for send/register; returns user-facing error or null. */
export function validateRegisterRoutingForSend(args: {
	placementManifest: PlacementManifest;
	routing?: RegisterRoutingInput;
}): string | null {
	const calldata = buildRegisterRoutingCalldata(args);
	return validateRegisterRoutingCalldata(calldata);
}

/** Registration email commitments aligned with routing (required + optional roster). */
export function buildRegistrationEmailCommitmentsForRouting(args: {
	placementManifest: PlacementManifest;
	viewerEmails: string[];
	routing?: RegisterRoutingInput;
}) {
	const calldata = buildRegisterRoutingCalldata({
		placementManifest: args.placementManifest,
		routing: args.routing,
	});
	const roster = mergeSortedCommitments(
		calldata.requiredCommitments,
		calldata.optionalCommitments,
	);
	const viewerEmailCommitmentsSorted = sortedCommitsForEmails(
		args.viewerEmails,
	);
	return {
		requiredCommitments: calldata.requiredCommitments,
		viewerEmailCommitmentsSorted,
		signersCommitment: emailCommitRoot(roster),
		viewersCommitment: emailCommitRoot(viewerEmailCommitmentsSorted),
	};
}

/** Build registry routing calldata; defaults to parallel all-required when routing omitted. */
export function buildRegisterRoutingCalldata(args: {
	placementManifest: PlacementManifest;
	routing?: RegisterRoutingInput;
}): RegisterRoutingCalldata {
	const roster = sortedSignerCommitsForManifest(args.placementManifest);
	const optionalEmails = normalizeEmails(
		args.routing?.optionalSignerEmails ?? [],
	);
	const optionalCommitments =
		optionalEmails.length > 0 ? sortedCommitsForEmails(optionalEmails) : [];
	const optionalSet = new Set(optionalCommitments);
	const requiredCommitments = roster.filter((c) => !optionalSet.has(c));

	const routingMode = args.routing?.routingMode ?? 0;
	const routingOrder = args.routing?.routingOrderEmails?.length
		? commitsForEmails(normalizeEmails(args.routing.routingOrderEmails))
		: [];
	const quorumN = args.routing?.quorumN ?? 0;
	let quorumSet = args.routing?.quorumSetEmails?.length
		? sortedCommitsForEmails(normalizeEmails(args.routing.quorumSetEmails))
		: [];
	if (quorumN > 0 && quorumSet.length === 0) {
		quorumSet = roster;
	}

	return {
		requiredCommitments,
		optionalCommitments,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
	};
}

export function validateRegisterRoutingCalldata(
	calldata: RegisterRoutingCalldata,
): string | null {
	if (calldata.requiredCommitments.length === 0) {
		return "At least one required signer is required";
	}
	const roster = [
		...calldata.requiredCommitments,
		...calldata.optionalCommitments,
	].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
	for (let i = 1; i < roster.length; i++) {
		if (roster[i] === roster[i - 1]) {
			return "Duplicate signer commitment in roster";
		}
	}
	if (calldata.routingMode === 0 && calldata.routingOrder.length > 0) {
		return "Parallel routing cannot include routingOrder";
	}
	if (calldata.routingMode === 1) {
		if (calldata.routingOrder.length !== roster.length) {
			return "Sequential routingOrder must match full roster";
		}
	}
	if (calldata.quorumSet.length > 0) {
		if (
			calldata.quorumN === 0 ||
			calldata.quorumN > calldata.quorumSet.length
		) {
			return "Invalid quorum configuration";
		}
	} else if (calldata.quorumN !== 0) {
		return "quorumN requires quorumSet";
	}
	return null;
}
