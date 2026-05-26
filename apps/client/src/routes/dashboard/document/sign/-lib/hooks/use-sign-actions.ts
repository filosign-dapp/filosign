import { useFilosignContext } from "@filosign/react";
import {
	useAckFile,
	useRegenerateColdInvite,
	useSignFile,
} from "@filosign/react/files";
import { buildRotatedInviteEnvelope } from "@filosign/react/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { ColdSharePackage } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import { buildColdInviteMagicLink } from "@/src/lib/domains/invites/cold-invite-search";

export function useSignActions(options: {
	pieceCid: string | undefined;
	file:
		| {
				kemCiphertext?: string | null;
				encryptedEncryptionKey?: string | null;
		  }
		| undefined;
	user: { wallet?: { address?: string } } | null | undefined;
	canSubmitPlacementSign: boolean;
	completedFieldIds: string[];
}) {
	const { pieceCid, file, user, canSubmitPlacementSign, completedFieldIds } =
		options;
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	const acknowledgeFile = useAckFile();
	const signFile = useSignFile();
	const regenerateColdInvite = useRegenerateColdInvite();

	const [coldShareDialogOpen, setColdShareDialogOpen] = useState(false);
	const [coldShare, setColdShare] = useState<ColdSharePackage | null>(null);
	const [signSuccessDialogOpen, setSignSuccessDialogOpen] = useState(false);

	const formatAddress = useCallback((address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}, []);

	const handleAcknowledge = useCallback(async () => {
		if (!pieceCid) return;
		try {
			await acknowledgeFile.mutateAsync({ pieceCid });
		} catch (error) {
			console.error(error);
		}
	}, [pieceCid, acknowledgeFile]);

	const handleSign = useCallback(async () => {
		if (!pieceCid) return;
		if (!canSubmitPlacementSign) {
			return;
		}
		try {
			await signFile.mutateAsync({ pieceCid, completedFieldIds });
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.files.piece.detail.key({
					input: { pieceCid },
				}),
			});
			setSignSuccessDialogOpen(true);
		} catch (error) {
			console.error(error);
		}
	}, [
		pieceCid,
		canSubmitPlacementSign,
		completedFieldIds,
		signFile,
		queryClient,
		rpcQuery.files.piece.detail,
	]);

	const executeRotateInvite = useCallback(async () => {
		if (!pieceCid || !file || !user?.wallet?.address) return;

		try {
			const { phrase, inviteToken, wrappedEncryptionKey } =
				await buildRotatedInviteEnvelope({
					pieceCid,
					walletAddress: user.wallet.address as `0x${string}`,
					kemCiphertext: file.kemCiphertext as `0x${string}`,
					encryptedEncryptionKey: file.encryptedEncryptionKey as `0x${string}`,
				});

			const result = await regenerateColdInvite.mutateAsync({
				pieceCid,
				inviteToken,
				wrappedEncryptionKey,
			});

			const magicLink = buildColdInviteMagicLink(window.location.origin, {
				pieceCid,
				inviteToken: result.inviteToken,
			});
			setColdShare({
				emails: result.recipientEmails,
				phrase,
				magicLink,
			});
			setColdShareDialogOpen(true);
		} catch (err) {
			console.error(err);
		}
	}, [pieceCid, file, user, regenerateColdInvite]);

	return {
		acknowledgeFile,
		signFile,
		signSuccessDialogOpen,
		setSignSuccessDialogOpen,
		coldShareDialogOpen,
		setColdShareDialogOpen,
		coldShare,
		setColdShare,
		executeRotateInvite,
		regenerateColdInvite,
		formatAddress,
		handleAcknowledge,
		handleSign,
	};
}
