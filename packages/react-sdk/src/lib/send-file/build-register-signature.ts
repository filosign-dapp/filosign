import type { FilosignContracts } from "@filosign/evm";
import { computeCidIdentifier, eip712signature } from "@filosign/evm";
import {
	buildRegistrationEmailCommitments,
	computePlacementCommitment,
	hashOrgIdCommitment,
	type PlacementManifest,
	type RegisterRoutingInput,
	ZERO_ORG_ID_COMMITMENT,
} from "@filosign/shared";
import { buildValidatedRegisterRouting } from "../register-routing";
import { withRegistryWalletActionLock } from "../registry-wallet-action-lock";
import type { FilosignWallet } from "../wallet";

export async function buildRegisterEnvelopeSignature(args: {
	contracts: FilosignContracts;
	wallet: FilosignWallet;
	pieceCid: string;
	placementManifest: PlacementManifest;
	viewerEmails: string[];
	routing?: RegisterRoutingInput;
	documentSha256: `0x${string}`;
	senderEmailCommitment: `0x${string}`;
	senderAuthSubjectCommitment: string;
	organizationId?: string;
	timestamp: number;
}): Promise<{
	signature: `0x${string}`;
	placementCommitment: `0x${string}`;
	cidIdentifier: `0x${string}`;
}> {
	const placementCommitment = computePlacementCommitment(
		args.placementManifest,
	);

	const { viewersCommitment } = buildRegistrationEmailCommitments({
		placementManifest: args.placementManifest,
		viewerEmails: args.viewerEmails,
	});
	const {
		calldata: routingCalldata,
		signersCommitment,
		requiredCommitmentsHash,
		optionalCommitmentsHash,
		routingOrderHash,
		quorumSetHash,
	} = buildValidatedRegisterRouting({
		placementManifest: args.placementManifest,
		routing: args.routing,
	});

	const orgIdCommitment = args.organizationId
		? hashOrgIdCommitment(args.organizationId)
		: ZERO_ORG_ID_COMMITMENT;

	const cidIdentifier = computeCidIdentifier(args.pieceCid);
	const signature = await withRegistryWalletActionLock(
		args.wallet.account.address as `0x${string}`,
		() =>
			eip712signature(args.contracts, "FSEnvelopeRegistry", {
				types: {
					RegisterEnvelope: [
						{ name: "cidIdentifier", type: "bytes32" },
						{ name: "sender", type: "address" },
						{ name: "signersCommitment", type: "bytes20" },
						{ name: "viewersCommitment", type: "bytes20" },
						{ name: "placementCommitment", type: "bytes32" },
						{ name: "documentSha256", type: "bytes32" },
						{ name: "senderEmailCommitment", type: "bytes32" },
						{ name: "senderAuthSubjectCommitment", type: "bytes32" },
						{ name: "orgIdCommitment", type: "bytes32" },
						{ name: "requiredCommitmentsHash", type: "bytes32" },
						{ name: "optionalCommitmentsHash", type: "bytes32" },
						{ name: "routingMode", type: "uint8" },
						{ name: "routingOrderHash", type: "bytes32" },
						{ name: "quorumN", type: "uint8" },
						{ name: "quorumSetHash", type: "bytes32" },
						{ name: "timestamp", type: "uint256" },
					],
				},
				primaryType: "RegisterEnvelope",
				message: {
					cidIdentifier,
					sender: args.wallet.account.address,
					signersCommitment,
					viewersCommitment,
					placementCommitment,
					documentSha256: args.documentSha256,
					senderEmailCommitment: args.senderEmailCommitment,
					senderAuthSubjectCommitment: args.senderAuthSubjectCommitment,
					orgIdCommitment,
					requiredCommitmentsHash,
					optionalCommitmentsHash,
					routingMode: routingCalldata.routingMode,
					routingOrderHash,
					quorumN: routingCalldata.quorumN,
					quorumSetHash,
					timestamp: BigInt(args.timestamp),
				},
			}),
	);

	return {
		signature,
		placementCommitment,
		cidIdentifier,
	};
}
