import type { FilosignContracts } from "@filosign/contracts";
import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import type { Hex } from "viem";
import type { FilosignWallet } from "./wallet";

export async function signAmendSigner(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	pieceCid: string;
	oldCommitment: Hex;
	newCommitment: Hex;
	timestamp: number;
}): Promise<Hex> {
	const nonce = await args.contracts.FSEnvelopeRegistry.read.nonce([
		args.wallet.account.address,
	]);
	const cidIdentifier = computeCidIdentifier(args.pieceCid);

	return eip712signature(args.contracts, "FSEnvelopeRegistry", {
		types: {
			AmendSigner: [
				{ name: "cidIdentifier", type: "bytes32" },
				{ name: "sender", type: "address" },
				{ name: "oldCommitment", type: "bytes32" },
				{ name: "newCommitment", type: "bytes32" },
				{ name: "timestamp", type: "uint256" },
				{ name: "nonce", type: "uint256" },
			],
		},
		primaryType: "AmendSigner",
		message: {
			cidIdentifier,
			sender: args.wallet.account.address,
			oldCommitment: args.oldCommitment,
			newCommitment: args.newCommitment,
			timestamp: BigInt(args.timestamp),
			nonce: BigInt(nonce),
		},
	});
}
