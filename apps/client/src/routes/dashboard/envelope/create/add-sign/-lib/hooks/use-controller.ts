import { useCryptoUnlocked } from "@filosign/react/auth";
import type { SendFileIncompleteStep } from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	draftSyncModeFromSearch,
	useServerDraftHydrate,
} from "@/src/lib/domains/drafts";
import { defaultPlacementFieldRect } from "@/src/lib/domains/files/field-box";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import {
	envelopeEmptyDraftRedirectTarget,
	envelopeSuppressEmptyDraftRedirect,
} from "@/src/lib/domains/placement/lifecycle";
import type {
	PlacementController,
	SendProgressState,
} from "@/src/lib/domains/placement/types";
import { useDocumentDimensions } from "@/src/lib/domains/placement/use-document-dimensions";
import { usePlacementControllerCore } from "@/src/lib/domains/placement/use-placement-controller-core";
import { recipientResolvedSignerAddress } from "@/src/lib/domains/placement/utils/recipient-address";
import { resolveSelfSignerOnRoster } from "@/src/lib/domains/placement/utils/self-signer";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useSendEnvelope } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-send-envelope";
import {
	buildPostSendShare,
	buildPostSendWarmSummary,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/complete";

import {
	markSendProgressSuccess,
	reduceSendProgress,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/progress";

const addSignRouteApi = getRouteApi("/dashboard/envelope/create/add-sign/");

type PartialPostSendContext = {
	pieceCid: string;
	incompleteSteps?: SendFileIncompleteStep[];
};

export function useAddSignController(): PlacementController {
	const navigate = useNavigate();
	const { serverDraftId: pendingServerDraftId } = addSignRouteApi.useSearch();
	const draftSyncMode = draftSyncModeFromSearch(pendingServerDraftId);
	const cryptoUnlocked = useCryptoUnlocked();
	const serverDraftCryptoReady =
		draftSyncMode !== "server" || cryptoUnlocked.data === true;
	const { serverDraftLoadState, documentLoadingMessage } =
		useServerDraftHydrate({
			pendingServerDraftId:
				draftSyncMode === "server" ? pendingServerDraftId : undefined,
			cryptoReady: serverDraftCryptoReady,
		});
	const createForm = useStorePersist((s) => s.createForm);
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const draftReady = Boolean(createForm?.documents?.length);
	const { data: selfProfile } = useUserProfile();
	const { width: docWidth, isMobile } = useDocumentDimensions();
	const fieldBoxCss = defaultPlacementFieldRect("signature", isMobile);

	const [sendStatus, setSendStatus] = useState<
		"idle" | "loading" | "signing" | "success" | "error"
	>("idle");
	const [postSendDialogOpen, setPostSendDialogOpen] = useState(false);
	const [postSendShare, setPostSendShare] = useState<ColdSharePackage | null>(
		null,
	);
	const [postSendWarmSummary, setPostSendWarmSummary] =
		useState<WarmShareSummary | null>(null);
	const [postSendIncompleteSteps, setPostSendIncompleteSteps] = useState<
		SendFileIncompleteStep[] | null
	>(null);
	const partialPostSendRef = useRef<PartialPostSendContext | null>(null);
	const [envelopeRegisteredInSession, setEnvelopeRegisteredInSession] =
		useState(false);
	const [sendProgressOpen, setSendProgressOpen] = useState(false);
	const [sendProgressState, setSendProgressState] =
		useState<SendProgressState | null>(null);

	const openSendProgress = useCallback((state: SendProgressState) => {
		setSendProgressState(state);
		setSendProgressOpen(true);
	}, []);

	const updateSendProgress = useCallback(
		(event: Parameters<typeof reduceSendProgress>[1]) => {
			if (
				event.phase === "registering_envelope" &&
				event.status === "done" &&
				"pieceCid" in event &&
				typeof event.pieceCid === "string"
			) {
				partialPostSendRef.current = { pieceCid: event.pieceCid };
				setEnvelopeRegisteredInSession(true);
			}
			setSendProgressState((prev) =>
				prev ? reduceSendProgress(prev, event) : prev,
			);
		},
		[],
	);

	const closeSendProgress = useCallback(() => {
		setSendProgressOpen(false);
		setSendProgressState(null);
	}, []);

	const markSendProgressComplete = useCallback(() => {
		setSendProgressState((prev) =>
			prev ? markSendProgressSuccess(prev) : prev,
		);
	}, []);

	const dismissSendProgress = useCallback(() => {
		const partial = partialPostSendRef.current;
		const isError = sendProgressState?.status === "error";
		if (isError && partial?.pieceCid && createForm) {
			const result = {
				success: true as const,
				pieceCid: partial.pieceCid,
				...(partial.incompleteSteps?.length
					? { incompleteSteps: partial.incompleteSteps }
					: {}),
			};
			setPostSendShare(buildPostSendShare(result));
			setPostSendWarmSummary(buildPostSendWarmSummary(result, createForm));
			setPostSendIncompleteSteps(partial.incompleteSteps ?? null);
			closeSendProgress();
			setPostSendDialogOpen(true);
			setSendStatus("success");
			partialPostSendRef.current = null;
			return;
		}
		closeSendProgress();
		setSendStatus("idle");
		partialPostSendRef.current = null;
		setEnvelopeRegisteredInSession(false);
	}, [closeSendProgress, createForm, sendProgressState?.status]);

	const suppressEmptyDraftRedirect = envelopeSuppressEmptyDraftRedirect({
		sendStatus,
		sendProgressOpen,
		postSendDialogOpen,
		serverDraftLoadState,
		pendingServerDraftId,
		draftReady,
	});

	const core = usePlacementControllerCore({
		preview: { draftSyncMode, serverDraftLoadState },
		lifecycle: {
			redirectTo: envelopeEmptyDraftRedirectTarget(),
			suppressEmptyDraftRedirect,
			documentLoadingMessage,
		},
	});

	useEffect(() => {
		if (!createForm?.signatureFields?.length || !selfProfile) return;
		const selfOnRoster = resolveSelfSignerOnRoster(
			createForm.recipients ?? [],
			selfProfile,
		);
		if (!selfOnRoster) return;

		const profileEmail = selfProfile.email?.trim()
			? normalizePlacementRecipientEmail(selfProfile.email)
			: null;
		if (!profileEmail || profileEmail === selfOnRoster.email) return;

		const rosterWallet =
			recipientResolvedSignerAddress(selfOnRoster.recipient) ?? "";
		let remapped = false;
		const nextFields = createForm.signatureFields.map((field) => {
			if (
				normalizePlacementRecipientEmail(field.assignedSignerEmail) !==
				profileEmail
			) {
				return field;
			}
			remapped = true;
			return {
				...field,
				assignedSignerEmail: selfOnRoster.email,
				assignedSignerName: "Me",
				assignedSignerWallet: rosterWallet || field.assignedSignerWallet,
				required: selfOnRoster.recipient.role === "signer",
			};
		});
		if (remapped) {
			setCreateForm({ ...createForm, signatureFields: nextFields });
		}
	}, [createForm, selfProfile, setCreateForm]);

	const onPartialPostSendUpdate = useCallback(
		(ctx: PartialPostSendContext | null) => {
			partialPostSendRef.current = ctx;
			setEnvelopeRegisteredInSession(ctx?.pieceCid != null);
		},
		[],
	);

	const getPartialPostSendPieceCid = useCallback(
		() => partialPostSendRef.current?.pieceCid,
		[],
	);

	const { handleSend, handleRetrySend } = useSendEnvelope({
		createForm,
		signatureFields: core.signatureFields,
		placementDocHeight: core.documentHeight,
		docWidth,
		fieldBoxCss,
		sendStatus,
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
	});

	const handlePostSendDone = useCallback(() => {
		setPostSendDialogOpen(false);
		setPostSendShare(null);
		setPostSendWarmSummary(null);
		setPostSendIncompleteSteps(null);
		partialPostSendRef.current = null;
		setEnvelopeRegisteredInSession(false);
		clearCreateForm();
		navigate({ to: "/dashboard" });
	}, [clearCreateForm, navigate]);

	return {
		...core,
		sendStatus,
		postSendDialogOpen,
		postSendShare,
		postSendWarmSummary,
		postSendIncompleteSteps,
		sendProgressOpen,
		sendProgressState,
		dismissSendProgress,
		handleSend,
		handleRetrySend,
		envelopeRegisteredInSession,
		handlePostSendDone,
	};
}

export type AddSignController = PlacementController;
