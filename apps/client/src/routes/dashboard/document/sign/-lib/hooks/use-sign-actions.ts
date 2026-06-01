import {
	useAckFile,
	useRegenerateColdInvite,
	useSignFile,
} from "@filosign/react/files";
import { buildRotatedInviteEnvelope } from "@filosign/react/utils";
import { useCallback, useState } from "react";
import type { ColdSharePackage } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import { buildColdInviteMagicLink } from "@/src/lib/domains/invites/cold-invite-search";
import { safeAsync } from "@/src/lib/utils/safe";

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
		const [, err] = await safeAsync(() =>
			acknowledgeFile.mutateAsync({ pieceCid }),
		);
		if (err) return;
	}, [pieceCid, acknowledgeFile]);

	const handleSign = useCallback(
		async (opts?: {
			settlementRecipientAck?: {
				termsVersion: string;
				acceptedAt: number;
			};
		}) => {
			if (!pieceCid) return;
			if (!canSubmitPlacementSign) {
				return;
			}
			const [, err] = await safeAsync(() =>
				signFile.mutateAsync({
					pieceCid,
					completedFieldIds,
					...(opts?.settlementRecipientAck
						? { settlementRecipientAck: opts.settlementRecipientAck }
						: {}),
				}),
			);
			if (err) return;
			setSignSuccessDialogOpen(true);
		},
		[pieceCid, canSubmitPlacementSign, completedFieldIds, signFile],
	);

	const executeRotateInvite = useCallback(async () => {
		const walletAddress = user?.wallet?.address;
		if (!pieceCid || !file || !walletAddress) return;

		const [, err] = await safeAsync(async () => {
			const { phrase, inviteToken, wrappedEncryptionKey } =
				await buildRotatedInviteEnvelope({
					pieceCid,
					walletAddress: walletAddress as `0x${string}`,
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
				email: result.recipientEmails[0],
			});
			setColdShare({
				emails: result.recipientEmails,
				phrase,
				magicLink,
			});
			setColdShareDialogOpen(true);
		});
		if (err) return;
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
