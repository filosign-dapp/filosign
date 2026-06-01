import type { PlacementManifest, RegisterRoutingInput } from "@filosign/shared";
import {
	buildRegisterRoutingCalldata,
	buildRegistrationEmailCommitmentsForRouting,
	validateRegisterRoutingCalldata,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";

export function resolveRegisterRoutingCalldata(args: {
	placementManifest: PlacementManifest;
	routing: RegisterRoutingInput | undefined;
	viewerEmails: string[];
}) {
	const routing = args.routing ?? {};

	const routingCalldata = buildRegisterRoutingCalldata({
		placementManifest: args.placementManifest,
		routing,
	});
	const routingError = validateRegisterRoutingCalldata(routingCalldata);
	if (routingError) {
		throw new ORPCError("BAD_REQUEST", { message: routingError });
	}

	const {
		requiredCommitments: routingRequiredCommitments,
		optionalCommitments: optionalCommitmentsSorted,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
	} = routingCalldata;

	const {
		requiredCommitments: requiredCommitmentsSorted,
		viewerEmailCommitmentsSorted,
	} = buildRegistrationEmailCommitmentsForRouting({
		placementManifest: args.placementManifest,
		viewerEmails: args.viewerEmails,
		routing,
	});

	return {
		requiredCommitmentsSorted,
		viewerEmailCommitmentsSorted,
		routingRequiredCommitments,
		optionalCommitmentsSorted,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
	};
}
