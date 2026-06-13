import { useFilosignContext } from "@filosign/react";
import {
	useAckFile,
	useRegenerateColdInvite,
	useSignFile,
} from "@filosign/react/files";
import { invalidateActivationProgress } from "@filosign/react/invalidate-queries";
import { useActivationProgress } from "@filosign/react/users";
import { buildRotatedInviteEnvelope } from "@filosign/react/utils";
import type { FieldCompletionMap, PlacementField } from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildColdInviteMagicLink } from "@/src/lib/domains/invites/cold-invite-search";
import type { ColdSharePackage } from "@/src/lib/domains/invites/types";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";
import { safeAsync } from "@/src/lib/utils/safe";
import { placementFieldIsCompleteForSubmit } from "./use-placement-fields";

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
	myPlacementFields: PlacementField[];
	completedFieldIds: string[];
	fieldCompletions: FieldCompletionMap;
	prepareForSign?: () => Promise<{
		completions: FieldCompletionMap;
		completedFieldIds: string[];
	}>;
}) {
	const {
		pieceCid,
		file,
		user,
		canSubmitPlacementSign,
		myPlacementFields,
		completedFieldIds,
		fieldCompletions,
		prepareForSign,
	} = options;

	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { activationQuery } = useActivationProgress();

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

			let nextCompletions = fieldCompletions;
			let nextCompletedFieldIds = completedFieldIds;

			if (prepareForSign) {
				const [, prepareErr] = await safeAsync(async () => {
					const prepared = await prepareForSign();
					nextCompletions = prepared.completions;
					nextCompletedFieldIds = prepared.completedFieldIds;
				});
				if (prepareErr) {
					showAppErrorToast(prepareErr);
					return;
				}
			}

			const requiredFields = myPlacementFields.filter(
				(field) => field.required,
			);
			const requiredOk =
				requiredFields.length === 0 ||
				requiredFields.every((field) =>
					placementFieldIsCompleteForSubmit(
						field,
						nextCompletions,
						nextCompletedFieldIds,
					),
				);
			const hasLeaf = nextCompletedFieldIds.length > 0;

			if (!canSubmitPlacementSign && !(requiredOk && hasLeaf)) {
				return;
			}
			if (!requiredOk || !hasLeaf) {
				toast.error("Complete all required fields before signing.");
				return;
			}

			const [, err] = await safeAsync(() =>
				signFile.mutateAsync({
					pieceCid,
					completedFieldIds: nextCompletedFieldIds,
					fieldCompletions: nextCompletions,
					...(opts?.settlementRecipientAck
						? { settlementRecipientAck: opts.settlementRecipientAck }
						: {}),
				}),
			);
			if (err) return;

			const isPracticeSign =
				pieceCid === activationQuery.data?.practicePieceCid?.trim();

			if (isPracticeSign) {
				await invalidateActivationProgress(queryClient, rpcQuery);
				navigate({ to: "/dashboard" });
				return;
			}

			setSignSuccessDialogOpen(true);
		},
		[
			pieceCid,
			canSubmitPlacementSign,
			myPlacementFields,
			completedFieldIds,
			fieldCompletions,
			prepareForSign,
			signFile,
			activationQuery.data?.practicePieceCid,
			queryClient,
			rpcQuery,
			navigate,
		],
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
