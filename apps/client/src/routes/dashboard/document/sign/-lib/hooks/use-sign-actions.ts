import { useFilosignContext } from "@filosign/react";
import {
	useAckFile,
	useRegenerateColdInvite,
	useSignFile,
} from "@filosign/react/files";
import { buildRotatedInviteEnvelope } from "@filosign/react/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
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
			toast.success("File acknowledged!");
		} catch (error) {
			console.error(error);
			toast.error("Failed to acknowledge file");
		}
	}, [pieceCid, acknowledgeFile]);

	const handleSign = useCallback(async () => {
		if (!pieceCid) return;
		if (!canSubmitPlacementSign) {
			toast.error("Mark every required field on the document first.");
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
			toast.success("Document signed successfully!");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to sign";
			console.error(error);
			toast.error(errorMessage);
		}
	}, [
		pieceCid,
		canSubmitPlacementSign,
		completedFieldIds,
		signFile,
		queryClient,
		rpcQuery.files.piece.detail,
	]);

	const handleRotateInvite = useCallback(async () => {
		if (!pieceCid || !file || !user?.wallet?.address) return;
		const confirmed = window.confirm(
			"Rotate invite now? Existing magic links and codes will stop working.",
		);
		if (!confirmed) return;

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
			toast.success("Invite rotated. Old links are now invalid.");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to rotate invite",
			);
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
		handleRotateInvite,
		regenerateColdInvite,
		formatAddress,
		handleAcknowledge,
		handleSign,
	};
}
