import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { signLinkOrgWallet } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export const FILOSIGN_ORG_WALLET_DOMAIN_NAME = "FilosignOrgWallet" as const;

export type LinkOrgWalletProofType = "eoa" | "safe_eip1271" | "safe_service";

export type LinkOrgWalletProof =
	| {
			proofType: "eoa";
			signature: Hex;
	  }
	| {
			proofType: "safe_eip1271";
			signature: Hex;
	  }
	| {
			proofType: "safe_service";
			signature: Hex;
			safeMessageHash: Hex;
	  };

export function linkProofToMutationArgs(proof: LinkOrgWalletProof): {
	proofType: LinkOrgWalletProofType;
	signature: Hex;
	safeMessageHash?: Hex;
} {
	if (proof.proofType === "safe_service") {
		return {
			proofType: proof.proofType,
			signature: proof.signature,
			safeMessageHash: proof.safeMessageHash,
		};
	}
	return {
		proofType: proof.proofType,
		signature: proof.signature,
	};
}

export type LinkOrgWalletTypedData = {
	domain: {
		name: typeof FILOSIGN_ORG_WALLET_DOMAIN_NAME;
		version: "1";
		chainId: number;
		verifyingContract: Address;
	};
	types: {
		LinkOrgWallet: readonly [
			{ readonly name: "organizationId"; readonly type: "string" },
			{ readonly name: "wallet"; readonly type: "address" },
			{ readonly name: "timestamp"; readonly type: "uint256" },
		];
	};
	message: {
		organizationId: string;
		wallet: Address;
		timestamp: bigint;
	};
};

export function linkOrgWalletTypedData(args: {
	organizationId: string;
	wallet: Address;
	timestamp: number;
	chainId: number;
	verifyingContract: Address;
}): LinkOrgWalletTypedData {
	return {
		domain: {
			name: FILOSIGN_ORG_WALLET_DOMAIN_NAME,
			version: "1",
			chainId: args.chainId,
			verifyingContract: args.verifyingContract,
		},
		types: {
			LinkOrgWallet: [
				{ name: "organizationId", type: "string" },
				{ name: "wallet", type: "address" },
				{ name: "timestamp", type: "uint256" },
			],
		},
		message: {
			organizationId: args.organizationId,
			wallet: args.wallet,
			timestamp: BigInt(args.timestamp),
		},
	};
}

export type LinkOrgWalletMutationArgs =
	| string
	| {
			organizationId: string;
			orgWalletAddress: Address;
			timestamp: number;
			signature: Hex;
			proofType?: LinkOrgWalletProofType;
			safeMessageHash?: Hex;
	  };

export function useLinkOrgWallet() {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: LinkOrgWalletMutationArgs) => {
			if (!isAuthed) throw new Error("Not authenticated");

			if (typeof args !== "string") {
				return rpcQuery.orgs.linkWallet.call({
					organizationId: args.organizationId,
					orgWalletAddress: args.orgWalletAddress,
					timestamp: args.timestamp,
					signature: args.signature,
					proofType: args.proofType ?? "eoa",
					...(args.safeMessageHash
						? { safeMessageHash: args.safeMessageHash }
						: {}),
				});
			}

			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to link the workspace treasury.");
			}

			const timestamp = await latestChainTimestamp(contracts);
			const signature = await signLinkOrgWallet({
				wallet,
				contracts,
				organizationId: args,
				timestamp,
			});

			return rpcQuery.orgs.linkWallet.call({
				organizationId: args,
				orgWalletAddress: wallet.account.address,
				timestamp,
				signature,
				proofType: "eoa",
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.key(),
			});
		},
	});
}
