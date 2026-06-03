import {
	buildRegisterRoutingCalldata,
	type PlacementManifest,
	type RegisterRoutingInput,
} from "@filosign/shared";
import type { Hex } from "viem";

/** On-chain routing/quorum arrays passed with sign and amend relays (hash verified on-chain). */
export function resolveSignRoutingCalldata(args: {
	placementManifest: PlacementManifest;
	registerRouting?: RegisterRoutingInput | null;
}): { routingOrder: Hex[]; quorumSet: Hex[] } {
	const calldata = buildRegisterRoutingCalldata({
		placementManifest: args.placementManifest,
		routing: args.registerRouting ?? {},
	});
	return {
		routingOrder: calldata.routingOrder,
		quorumSet: calldata.quorumSet,
	};
}

export function patchRoutingCalldataForAmend(args: {
	routingOrder: Hex[];
	quorumSet: Hex[];
	oldCommitment: Hex;
	newCommitment: Hex;
}): { routingOrder: Hex[]; quorumSet: Hex[] } {
	const replace = (list: Hex[]) =>
		list.map((c) => (c === args.oldCommitment ? args.newCommitment : c));
	return {
		routingOrder: replace(args.routingOrder),
		quorumSet: replace(args.quorumSet),
	};
}
