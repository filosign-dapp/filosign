import type { PlacementManifest, RegisterRoutingInput } from "@filosign/shared";
import {
	buildRegisterRoutingCalldata,
	buildRegistrationEmailCommitments,
	validateRegisterRoutingCalldata,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";

export function resolveRegisterRoutingCalldata(args: {
	placementManifest: PlacementManifest;
	routing: RegisterRoutingInput | undefined;
	viewerEmails: string[];
}) {
	const routing = args.routing ?? {};
	const {
		requiredCommitments: requiredCommitmentsSorted,
		viewerEmailCommitmentsSorted,
	} = buildRegistrationEmailCommitments({
		placementManifest: args.placementManifest,
		viewerEmails: args.viewerEmails,
	});

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

	if (
		requiredCommitmentsSorted.some(
			(c, i) =>
				c.toLowerCase() !== routingRequiredCommitments[i]?.toLowerCase(),
		) ||
		requiredCommitmentsSorted.length !== routingRequiredCommitments.length
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Routing required signers do not match manifest roster",
		});
	}

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
