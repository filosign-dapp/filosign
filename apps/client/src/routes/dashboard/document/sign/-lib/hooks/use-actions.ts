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
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { buildColdInviteMagicLink } from "@/src/lib/domains/invites/cold-invite-search";
import type { ColdSharePackage } from "@/src/lib/domains/invites/types";
import { suppressGlobalErrorToast } from "@/src/lib/errors";
import { presentAppError } from "@/src/lib/errors/present-app-error";
import { safeAsync } from "@/src/lib/utils/safe";
import {
	type EnvelopeProgressLike,
	willSignCompleteEnvelope,
} from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";
import {
	buildSignProgressPlan,
	createInitialSignProgressState,
	reduceSignProgress,
	type SignProgressEvent,
	type SignProgressState,
} from "@/src/routes/dashboard/document/sign/-lib/utils/sign/progress";
import { placementFieldIsCompleteForSubmit } from "./use-placement-fields";

type SignRequest = {
	settlementRecipientAck?: {
		termsVersion: string;
		acceptedAt: number;
	};
};

function progressErrorMessage(error: unknown): string {
	const presented = presentAppError(error);
	return presented.description || presented.title;
}

export function useSignActions(options: {
	pieceCid: string | undefined;
	file:
		| {
				kemCiphertext?: string | null;
				encryptedEncryptionKey?: string | null;
				participantAccess?: {
					acknowledged?: boolean;
				} | null;
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
	isSender?: boolean;
	senderHasAssignedFields?: boolean;
	envelopeProgress?: EnvelopeProgressLike | null;
	settlementRuleCount?: number;
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
		isSender = false,
		senderHasAssignedFields = false,
		envelopeProgress,
		settlementRuleCount = 0,
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
	const [signProgressOpen, setSignProgressOpen] = useState(false);
	const [signProgressState, setSignProgressState] =
		useState<SignProgressState | null>(null);
	const [lastSignRequest, setLastSignRequest] = useState<SignRequest | null>(
		null,
	);

	const formatAddress = useCallback((address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}, []);

	const updateSignProgress = useCallback((event: SignProgressEvent) => {
		setSignProgressState((prev) =>
			prev ? reduceSignProgress(prev, event) : prev,
		);
	}, []);

	const closeSignProgress = useCallback(() => {
		setSignProgressOpen(false);
		setSignProgressState(null);
	}, []);

	const dismissSignProgress = useCallback(() => {
		closeSignProgress();
	}, [closeSignProgress]);

	const handleAcknowledge = useCallback(async () => {
		if (!pieceCid) return;
		const [, err] = await safeAsync(() =>
			acknowledgeFile.mutateAsync({ pieceCid }),
		);
		if (err) return;
	}, [pieceCid, acknowledgeFile]);

	const handleSign = useCallback(
		async (opts?: SignRequest) => {
			if (!pieceCid) return;

			const needsAcknowledge = Boolean(
				isSender &&
					senderHasAssignedFields &&
					!file?.participantAccess?.acknowledged,
			);
			const needsPrepareFields = Boolean(prepareForSign);

			let nextCompletions = fieldCompletions;
			let nextCompletedFieldIds = completedFieldIds;

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
				toastUser.error(TOASTS.sign.completeRequiredFields.title, {
					hint: TOASTS.sign.completeRequiredFields.hint,
				});
				return;
			}

			setLastSignRequest(opts ?? null);
			const plan = buildSignProgressPlan({
				needsAcknowledge,
				needsPrepareFields,
			});
			setSignProgressState(createInitialSignProgressState(plan));
			setSignProgressOpen(true);

			if (needsAcknowledge) {
				updateSignProgress({ phase: "acknowledging", status: "start" });
				const [, ackErr] = await safeAsync(() =>
					acknowledgeFile.mutateAsync({ pieceCid }, suppressGlobalErrorToast()),
				);
				if (ackErr) {
					updateSignProgress({
						phase: "acknowledging",
						status: "error",
						errorMessage: progressErrorMessage(ackErr),
					});
					return;
				}
				updateSignProgress({ phase: "acknowledging", status: "done" });
			}

			if (prepareForSign) {
				updateSignProgress({ phase: "preparing_fields", status: "start" });
				const [, prepareErr] = await safeAsync(async () => {
					const prepared = await prepareForSign();
					nextCompletions = prepared.completions;
					nextCompletedFieldIds = prepared.completedFieldIds;
				});
				if (prepareErr) {
					updateSignProgress({
						phase: "preparing_fields",
						status: "error",
						errorMessage: progressErrorMessage(prepareErr),
					});
					return;
				}
				updateSignProgress({ phase: "preparing_fields", status: "done" });
			}

			const [, err] = await safeAsync(() =>
				signFile.mutateAsync(
					{
						pieceCid,
						completedFieldIds: nextCompletedFieldIds,
						fieldCompletions: nextCompletions,
						...(opts?.settlementRecipientAck
							? { settlementRecipientAck: opts.settlementRecipientAck }
							: {}),
						onProgress: updateSignProgress,
					},
					suppressGlobalErrorToast(),
				),
			);
			if (err) return;

			closeSignProgress();

			if (
				settlementRuleCount > 0 &&
				willSignCompleteEnvelope(envelopeProgress)
			) {
				toastUser.message(TOASTS.sign.payoutProcessing.title, {
					hint: TOASTS.sign.payoutProcessing.hint,
				});
			}

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
			isSender,
			senderHasAssignedFields,
			file?.participantAccess?.acknowledged,
			acknowledgeFile,
			canSubmitPlacementSign,
			myPlacementFields,
			completedFieldIds,
			fieldCompletions,
			prepareForSign,
			signFile,
			updateSignProgress,
			closeSignProgress,
			activationQuery.data?.practicePieceCid,
			queryClient,
			rpcQuery,
			navigate,
			envelopeProgress,
			settlementRuleCount,
		],
	);

	const retrySign = useCallback(() => {
		void handleSign(lastSignRequest ?? undefined);
	}, [handleSign, lastSignRequest]);

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
		signProgressOpen,
		signProgressState,
		dismissSignProgress,
		retrySign,
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
