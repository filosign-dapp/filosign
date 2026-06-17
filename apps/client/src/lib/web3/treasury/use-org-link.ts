import { useFilosignContext } from "@filosign/react";
import {
	linkProofToMutationArgs,
	useLinkOrgWallet,
} from "@filosign/react/orgs";
import { useCallback, useState } from "react";
import type { Address } from "viem";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { linkOrgWalletWithTreasurySession } from "@/src/lib/web3/treasury/link-org-wallet";
import { useTreasuryConnection } from "./use-connection";

type LinkTreasuryArgs = {
	organizationId: string;
};

export function useTreasuryOrgLink() {
	const { contracts } = useFilosignContext();
	const linkOrgWallet = useLinkOrgWallet();
	const treasury = useTreasuryConnection();
	const { connect, beginSigning, beginPollingSafe, disconnect, status } =
		treasury;
	const [pendingSafeAddress, setPendingSafeAddress] = useState<
		Address | undefined
	>();

	const linkTreasury = useCallback(
		async ({ organizationId }: LinkTreasuryArgs) => {
			try {
				if (!contracts) {
					throw new Error("Contracts are not ready. Please try again.");
				}
				const session = await connect();
				const timestamp = Math.floor(Date.now() / 1000);
				beginSigning();
				const proof = await linkOrgWalletWithTreasurySession({
					session,
					organizationId,
					timestamp,
					verifyingContract: contracts.FSEnvelopeRegistry.address,
					onPollingSafe: () => {
						setPendingSafeAddress(session.address);
						beginPollingSafe();
					},
				});
				const proofArgs = linkProofToMutationArgs(proof);
				await linkOrgWallet.mutateAsync(
					{
						organizationId,
						orgWalletAddress: session.address,
						timestamp,
						signature: proofArgs.signature,
						proofType: proofArgs.proofType,
						...(proofArgs.safeMessageHash
							? { safeMessageHash: proofArgs.safeMessageHash }
							: {}),
					},
					suppressGlobalErrorToast(),
				);
				return session.address;
			} catch (err) {
				showAppErrorToast(err);
				throw err;
			} finally {
				setPendingSafeAddress(undefined);
				await disconnect();
			}
		},
		[
			beginPollingSafe,
			beginSigning,
			connect,
			contracts,
			disconnect,
			linkOrgWallet,
		],
	);

	const isLinking =
		linkOrgWallet.isPending || status === "connecting" || status === "signing";

	return {
		linkTreasury,
		isLinking,
		isPollingSafe: status === "polling_safe",
		pendingSafeAddress,
	};
}
