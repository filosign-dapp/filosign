import type { PlacementManifest, RegisterRoutingInput } from "@filosign/shared";
import {
	buildRegisterRoutingCalldata,
	emailCommitRoot,
	hashCommitmentsPacked,
	mergeSortedCommitments,
	validateRegisterRoutingCalldata,
} from "@filosign/shared";

export type { RegisterRoutingInput } from "@filosign/shared";
export { mergeSortedCommitments } from "@filosign/shared";

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
