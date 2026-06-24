import { useFilosignContext } from "@filosign/react";
import { useCaptureAppEvent } from "@filosign/react/analytics";
import { useEntitlements } from "@filosign/react/billing";
import { useMarkDraftSent } from "@filosign/react/drafts";
import type {
	SendFileIncompleteStep,
	SendFileResume,
} from "@filosign/react/files";
import {
	ensureAcknowledged,
	useRetryPostSendSatellites,
	useSendFile,
	useSignFile,
} from "@filosign/react/files";
import { useActiveOrganization } from "@filosign/react/orgs";
import {
	type ProfileByAddress,
	useProfilesByAddresses,
	useUserProfile,
	useUserSignatures,
} from "@filosign/react/users";
import { walletAccountAddress } from "@filosign/react/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import type { Address } from "viem";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import type { PlacementFieldRect } from "@/src/lib/domains/files/field-box";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import { useOrgWalletAddress } from "@/src/lib/domains/orgs/use-org-wallet-address";
import { usePayoutPayerBalance } from "@/src/lib/domains/settlements";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useTreasurySettlementRegistrar } from "@/src/lib/web3/treasury";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	buildPostSendShare,
	buildPostSendWarmSummary,
	selfSignAfterSend,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/complete";
import { prepareSelfSignCompletions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/prepare-self-sign";
import {
	buildRetrySendProgressPlan,
	buildSendProgressPlan,
	createInitialSendProgressState,
	type SendProgressEvent,
	type SendProgressState,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/progress";
import { retryIncompleteSendSteps } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/retry-incomplete-steps";
import { runEnvelopeSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/run";
import type { SendSession } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/session";
import { recipientResolvedSignerAddress } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

type SendStatus = "idle" | "loading" | "signing" | "success" | "error";

type PartialPostSendContext = {
	pieceCid: string;
	incompleteSteps?: SendFileIncompleteStep[];
};

export function useSendEnvelope(args: {
	createForm: CreateForm | null;
	signatureFields: SignatureField[];
	placementDocHeight: number;
	docWidth: number;
	fieldBoxCss: PlacementFieldRect;
	sendStatus: SendStatus;
	setSendStatus: (status: SendStatus) => void;
	setPostSendDialogOpen: (open: boolean) => void;
	setPostSendShare: (share: ColdSharePackage | null) => void;
	setPostSendWarmSummary: (summary: WarmShareSummary | null) => void;
	setPostSendIncompleteSteps: (steps: SendFileIncompleteStep[] | null) => void;
	openSendProgress: (state: SendProgressState) => void;
	updateSendProgress: (event: SendProgressEvent) => void;
	closeSendProgress: () => void;
	markSendProgressComplete: () => void;
	onPartialPostSendUpdate: (ctx: PartialPostSendContext | null) => void;
	getPartialPostSendPieceCid: () => string | undefined;
}) {
	const {
		createForm,
		signatureFields,
		placementDocHeight,
		docWidth,
		fieldBoxCss,
		setSendStatus,
		setPostSendDialogOpen,
		setPostSendShare,
		setPostSendWarmSummary,
		setPostSendIncompleteSteps,
		openSendProgress,
		updateSendProgress,
		closeSendProgress,
		markSendProgressComplete,
		onPartialPostSendUpdate,
		getPartialPostSendPieceCid,
	} = args;

	const captureAppEvent = useCaptureAppEvent();
	const sendFile = useSendFile();
	const retryPostSend = useRetryPostSendSatellites();
	const signFile = useSignFile();
	const markDraftSent = useMarkDraftSent();
	const { data: entitlements } = useEntitlements();
	const { rpcQuery, contracts, wallet } = useFilosignContext();
	const queryClient = useQueryClient();
	const activeOrg = useActiveOrganization();
	const orgWalletAddress = useOrgWalletAddress();
	const { data: selfProfile } = useUserProfile();
	const { data: signaturesData } = useUserSignatures();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const sendSessionRef = useRef<SendSession | null>(null);
	const preRegisterCacheRef = useRef<SendFileResume | null>(null);
	const isSendingRef = useRef(false);
	const payoutPayerAddress = usePayoutPayerBalance(
		createForm?.payoutPayerSource,
	);
	const { address: walletAddress, balance: walletUsdcBalance } =
		payoutPayerAddress;

	const registerSettlementRules = useTreasurySettlementRegistrar(
		createForm?.payoutPayerSource,
	);
	const connectedWalletAddress = wallet?.account
		? walletAccountAddress(wallet.account)
		: undefined;

	const recipientAddresses = useMemo(
		() =>
			(createForm?.recipients ?? [])
				.map((r) => recipientResolvedSignerAddress(r))
				.filter((a): a is Address => a !== null),
		[createForm?.recipients],
	);
	const { data: recipientProfilesMap, isLoading: recipientProfilesLoading } =
		useProfilesByAddresses(
			recipientAddresses.length > 0 ? recipientAddresses : undefined,
		);

	const recipientProfilesMapWithRecipient = useMemo(() => {
		const map = new Map<
			Address,
			{ recipient: Recipient; profile: ProfileByAddress }
		>();
		createForm?.recipients?.forEach((recipient) => {
			const addr = recipientResolvedSignerAddress(recipient);
			if (!addr) return;
			const profile = recipientProfilesMap?.get(addr);
			if (profile) {
				map.set(addr, { recipient, profile });
			}
		});
		return map;
	}, [createForm?.recipients, recipientProfilesMap]);

	const syncPartialPostSend = useCallback(
		(ctx: PartialPostSendContext | null) => {
			onPartialPostSendUpdate(ctx);
		},
		[onPartialPostSendUpdate],
	);

	const ensureAcknowledgedForSend = useCallback(
		async (pieceCid: string) => {
			if (!contracts || !wallet) {
				throw new Error("Wallet connection required");
			}
			const authSubjectCommitment = selfProfile?.authSubjectCommitment;
			if (!authSubjectCommitment) {
				throw new Error(
					"Profile missing Auth subject commitment; try re-login.",
				);
			}

			await ensureAcknowledged(
				{
					contracts,
					wallet,
					rpcQuery,
					authSubjectCommitment,
				},
				pieceCid,
			);

			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.piece.detail.key({
					input: { pieceCid },
				}),
			});
		},
		[
			contracts,
			queryClient,
			rpcQuery,
			selfProfile?.authSubjectCommitment,
			wallet,
		],
	);

	const prepareSelfSignForSend = useCallback(
		async (input: { pieceCid: string; selfFieldIds: string[] }) => {
			if (!selfProfile) {
				throw new Error("Profile required for self-signing.");
			}
			return prepareSelfSignCompletions({
				pieceCid: input.pieceCid,
				selfFieldIds: input.selfFieldIds,
				selfProfile,
				signatures: signaturesData?.signatures ?? [],
				rpcQuery,
			});
		},
		[rpcQuery, selfProfile, signaturesData?.signatures],
	);

	const handleSend = useCallback(async () => {
		if (isSendingRef.current || !createForm) return;

		const plan = buildSendProgressPlan({
			createForm,
			signatureFields,
			selfProfile,
		});
		openSendProgress(createInitialSendProgressState(plan));

		await runEnvelopeSend({
			createForm,
			signatureFields,
			entitlements,
			recipientProfilesLoading,
			recipientProfilesMapWithRecipient,
			placementDocHeight,
			docWidth,
			fieldBoxCss,
			walletAddress,
			walletUsdcBalance,
			connectedWalletAddress,
			registerSettlementRules,
			orgWalletAddress: orgWalletAddress ?? null,
			activeOrg,
			selfProfile,
			sendFile,
			signFile,
			markDraftSent,
			rpcQuery,
			ensureAcknowledged: ensureAcknowledgedForSend,
			prepareSelfSignCompletions: prepareSelfSignForSend,
			captureAppEvent,
			setCreateForm,
			setSendStatus,
			setPostSendShare,
			setPostSendWarmSummary,
			setPostSendIncompleteSteps,
			setPostSendDialogOpen,
			isSendingRef,
			onProgress: updateSendProgress,
			onSendProgressSuccess: markSendProgressComplete,
			closeSendProgress,
			sendSessionRef,
			onPartialPostSendUpdate: syncPartialPostSend,
			getPartialPostSendPieceCid,
			preRegisterCacheRef,
		});
	}, [
		createForm,
		signatureFields,
		entitlements,
		recipientProfilesLoading,
		recipientProfilesMapWithRecipient,
		placementDocHeight,
		docWidth,
		fieldBoxCss,
		walletAddress,
		walletUsdcBalance,
		connectedWalletAddress,
		registerSettlementRules,
		orgWalletAddress,
		activeOrg,
		selfProfile,
		sendFile,
		signFile,
		markDraftSent,
		rpcQuery,
		ensureAcknowledgedForSend,
		prepareSelfSignForSend,
		captureAppEvent,
		setCreateForm,
		setSendStatus,
		setPostSendShare,
		setPostSendWarmSummary,
		setPostSendIncompleteSteps,
		setPostSendDialogOpen,
		openSendProgress,
		updateSendProgress,
		closeSendProgress,
		markSendProgressComplete,
		syncPartialPostSend,
		getPartialPostSendPieceCid,
	]);

	const handleRetrySend = useCallback(async () => {
		if (isSendingRef.current || !createForm) return;

		const session = sendSessionRef.current;
		if (!session) {
			if (getPartialPostSendPieceCid()) {
				return;
			}
			return handleSend();
		}

		if (session.incompleteSteps.length === 0) {
			return;
		}

		isSendingRef.current = true;
		const plan = buildRetrySendProgressPlan({
			createForm,
			incompleteSteps: session.incompleteSteps,
			signatureFields,
			selfProfile,
		});
		openSendProgress(createInitialSendProgressState(plan));

		try {
			const remaining = await retryIncompleteSendSteps({
				session,
				retrySatellites: retryPostSend.mutateAsync.bind(retryPostSend),
				retrySelfSign: () =>
					selfSignAfterSend({
						createForm,
						signatureFields,
						selfProfile,
						result: { success: true, pieceCid: session.pieceCid },
						signFile,
						ensureAcknowledged: ensureAcknowledgedForSend,
						prepareSelfSignCompletions: prepareSelfSignForSend,
						setSendStatus,
						onProgress: updateSendProgress,
						suppressFailureToast: true,
					}),
				onProgress: updateSendProgress,
			});

			if (remaining.length > 0) {
				sendSessionRef.current = {
					...session,
					incompleteSteps: remaining,
				};
				syncPartialPostSend({
					pieceCid: session.pieceCid,
					incompleteSteps: remaining,
				});
				setSendStatus("error");
				updateSendProgress({
					phase: "send_failed",
					status: "error",
					errorMessage:
						"Envelope sent, but some follow-up steps did not finish.",
				});
				return;
			}

			sendSessionRef.current = null;
			preRegisterCacheRef.current = null;
			syncPartialPostSend(null);
			markSendProgressComplete();
			setSendStatus("success");

			const result = { success: true as const, pieceCid: session.pieceCid };
			setPostSendShare(buildPostSendShare(result));
			setPostSendWarmSummary(buildPostSendWarmSummary(result, createForm));
			setPostSendIncompleteSteps(null);
			closeSendProgress();
			setPostSendDialogOpen(true);
		} catch (error) {
			setSendStatus("error");
			updateSendProgress({
				phase: "send_failed",
				status: "error",
				errorMessage:
					error instanceof Error
						? error.message
						: "Failed to finish attachment or payout setup.",
			});
			console.error("Post-send retry failed:", error);
		} finally {
			isSendingRef.current = false;
		}
	}, [
		createForm,
		signatureFields,
		selfProfile,
		getPartialPostSendPieceCid,
		handleSend,
		openSendProgress,
		retryPostSend,
		signFile,
		ensureAcknowledgedForSend,
		prepareSelfSignForSend,
		updateSendProgress,
		syncPartialPostSend,
		markSendProgressComplete,
		setSendStatus,
		setPostSendShare,
		setPostSendWarmSummary,
		setPostSendIncompleteSteps,
		closeSendProgress,
		setPostSendDialogOpen,
	]);

	return {
		handleSend,
		handleRetrySend,
	};
}
