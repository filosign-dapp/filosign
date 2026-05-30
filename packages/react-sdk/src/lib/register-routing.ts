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
		if (required[i]! < optional[j]!) {
			merged.push(required[i]!);
			i++;
		} else {
			merged.push(optional[j]!);
			j++;
		}
	}
	while (i < required.length) {
		merged.push(required[i]!);
		i++;
	}
	while (j < optional.length) {
		merged.push(optional[j]!);
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
