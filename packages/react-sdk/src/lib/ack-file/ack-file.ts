import type { FilosignContracts } from "@filosign/evm";
import { computeCidIdentifier, eip712signature } from "@filosign/evm";
import {
	FILE_ACK_INTENT_VERSION_V1,
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { type Address, getAddress } from "viem";
import type { FilosignRpcQueryUtils } from "../../context/FilosignContext";
import { latestChainTimestamp } from "../chain-time";
import { envelopeRegistryAt } from "../envelope-registry-at";
import type { FilosignWallet } from "../wallet";

type PieceDetailSigner = {
	wallet: string;
	email?: string | null;
};

export type AckFileArgs = {
	pieceCid: string;
};

export type AckFileDeps = {
	contracts: FilosignContracts;
	wallet: FilosignWallet;
	rpcQuery: FilosignRpcQueryUtils;
	authSubjectCommitment: string;
};

function resolveRosterEmail(args: {
	wallet: Address;
	signers: PieceDetailSigner[];
	viewers: PieceDetailSigner[];
}): string {
	for (const s of args.signers) {
		if (getAddress(s.wallet) === args.wallet) {
			const e = s.email?.trim();
			if (e) return e;
		}
	}
	for (const v of args.viewers) {
		if (getAddress(v.wallet) === args.wallet) {
			const e = v.email?.trim();
			if (e) return e;
		}
	}
	throw new Error(
		"No email on file roster for your wallet; sync your profile or re-open the document.",
	);
}

export async function ackFile(
	deps: AckFileDeps,
	args: AckFileArgs,
): Promise<true> {
	const { pieceCid } = args;
	const fileResponse = await deps.rpcQuery.files.piece.detail.call({
		pieceCid,
	});

	const { sender, registryAddress, signers, viewers } = fileResponse;
	const registry = envelopeRegistryAt(deps.contracts, registryAddress);

	const cidIdentifier = computeCidIdentifier(pieceCid);
	const timestamp = await latestChainTimestamp(deps.contracts);
	const reg = await registry.read.envelopeRegistrations([cidIdentifier]);
	const signersCommitment = reg.signersCommitment;

	const addr = getAddress(deps.wallet.account.address);
	const rawEmail = resolveRosterEmail({
		wallet: addr,
		signers,
		viewers,
	});
	const viewerEmailCommitment = hashNormalizedSignerEmail(
		normalizePlacementRecipientEmail(rawEmail),
	);

	const signature = await eip712signature(
		deps.contracts,
		"FSEnvelopeRegistry",
		{
			types: {
				AckEnvelope: [
					{ name: "cidIdentifier", type: "bytes32" },
					{ name: "sender", type: "address" },
					{ name: "viewerWallet", type: "address" },
					{ name: "viewerEmailCommitment", type: "bytes32" },
					{ name: "authSubjectCommitment", type: "bytes32" },
					{ name: "signersCommitment", type: "bytes20" },
					{ name: "timestamp", type: "uint256" },
				],
			},
			primaryType: "AckEnvelope",
			message: {
				cidIdentifier,
				sender,
				viewerWallet: deps.wallet.account.address,
				viewerEmailCommitment,
				authSubjectCommitment: deps.authSubjectCommitment,
				signersCommitment,
				timestamp: BigInt(timestamp),
			},
		},
		{ verifyingContract: registry.address },
	);

	await deps.rpcQuery.files.piece.ack.call({
		pieceCid,
		body: {
			signature,
			timestamp,
			intentVersion: FILE_ACK_INTENT_VERSION_V1,
		},
	});

	return true;
}
