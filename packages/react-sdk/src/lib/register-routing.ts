import type { PlacementManifest, RegisterRoutingInput } from "@filosign/shared";
import {
	buildRegisterRoutingCalldata,
	emailCommitRoot,
	hashCommitmentsPacked,
	validateRegisterRoutingCalldata,
} from "@filosign/shared";
import type { Hex } from "viem";

export type { RegisterRoutingInput } from "@filosign/shared";

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

export function buildValidatedRegisterRouting(args: {
	placementManifest: PlacementManifest;
	routing?: RegisterRoutingInput;
}) {
	const calldata = buildRegisterRoutingCalldata(args);
	const error = validateRegisterRoutingCalldata(calldata);
	if (error) {
		throw new Error(error);
	}
	const roster = mergeSortedCommitments(
		calldata.requiredCommitments,
		calldata.optionalCommitments,
	);
	return {
		calldata,
		signersCommitment: emailCommitRoot(roster),
		requiredCommitmentsHash: hashCommitmentsPacked(
			calldata.requiredCommitments,
		),
		optionalCommitmentsHash: hashCommitmentsPacked(
			calldata.optionalCommitments,
		),
		routingOrderHash: hashCommitmentsPacked(calldata.routingOrder),
		quorumSetHash: hashCommitmentsPacked(calldata.quorumSet),
	};
}
