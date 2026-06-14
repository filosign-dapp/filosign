import type { FilosignRpcQueryUtils } from "@filosign/react";
import {
	type CaptureAppEvent,
	CLIENT_ANALYTICS_EVENTS,
} from "@filosign/react/analytics";
import type { EntitlementsSnapshot } from "@filosign/react/billing";
import {
	formatSettlementSimError,
	type SendFileArgs,
	type SendFileResult,
	type SignFileArgs,
} from "@filosign/react/files";
import type { OrgListItem } from "@filosign/react/orgs";
import type {
	AppRouterClient,
	InferClientInputs,
	InferClientOutputs,
} from "@filosign/react/orpc";
import type { ProfileByAddress, UserProfile } from "@filosign/react/users";
import type { FieldCompletionMap } from "@filosign/shared";
import type { Address } from "viem";
import { BaseError } from "viem";
import { toastUser } from "@/src/lib/copy/toast";
import { hydrateAttachmentPacketDrafts } from "@/src/lib/domains/drafts";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import type { PlacementFieldRect } from "@/src/lib/domains/files/field-box";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import { suppressGlobalErrorToast } from "@/src/lib/errors";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { SendEnvelopeError } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";
import {
	buildEnvelopeSendPayload,
	loadDocumentPayloads,
	reportRoutingValidationError,
	resolveSettlementDrafts,
} from "./build-payload";
import {
	buildPostSendShare,
	buildPostSendWarmSummary,
	selfSignAfterSend,
	trackEnvelopeSendSucceeded,
} from "./complete";
import type { SendProgressEvent } from "./progress";
import {
	reportEnvelopeSendValidationFailure,
	rosterEmailsFromRecipients,
	validateAttachmentPacketsForSend,
	validateEnvelopeDocuments,
	validateEnvelopeRecipients,
	validateRecipientProfiles,
	validateSettlementDraftsForSend,
	validateSettlementPayoutBalance,
	validateSignerPlacementFields,
} from "./validate";

type MarkDraftSentInput =
	InferClientInputs<AppRouterClient>["drafts"]["markSent"];
type MarkDraftSentOutput =
	InferClientOutputs<AppRouterClient>["drafts"]["markSent"];

export type EnvelopeSendDeps = {
	selfProfile: UserProfile | undefined;
	activeOrg: OrgListItem | null | undefined;
	sendFile: {
		mutateAsync: (
			input: SendFileArgs,
			options?: ReturnType<typeof suppressGlobalErrorToast>,
		) => Promise<SendFileResult>;
	};
	signFile: {
		mutateAsync: (
			input: SignFileArgs,
			options?: ReturnType<typeof suppressGlobalErrorToast>,
		) => Promise<boolean>;
	};
	markDraftSent: {
		mutateAsync: (input: MarkDraftSentInput) => Promise<MarkDraftSentOutput>;
	};
	rpcQuery: FilosignRpcQueryUtils;
	ensureAcknowledged: (pieceCid: string) => Promise<void>;
	prepareSelfSignCompletions: (input: {
		pieceCid: string;
		selfFieldIds: string[];
	}) => Promise<{
		completedFieldIds: string[];
		fieldCompletions: FieldCompletionMap;
	}>;
	captureAppEvent: CaptureAppEvent;
	setCreateForm: (form: CreateForm) => void;
	setSendStatus: (
		status: "idle" | "loading" | "signing" | "success" | "error",
	) => void;
	setPostSendShare: (share: ColdSharePackage | null) => void;
	setPostSendWarmSummary: (summary: WarmShareSummary | null) => void;
	setPostSendDialogOpen: (open: boolean) => void;
	isSendingRef: React.MutableRefObject<boolean>;
	onProgress?: (event: SendProgressEvent) => void;
	onSendProgressSuccess?: () => void;
	closeSendProgress?: () => void;
};

export type RunEnvelopeSendArgs = EnvelopeSendDeps & {
	createForm: CreateForm;
	signatureFields: SignatureField[];
	entitlements: EntitlementsSnapshot | undefined;
	recipientProfilesLoading: boolean;
	recipientProfilesMapWithRecipient: Map<
		Address,
		{ recipient: Recipient; profile: ProfileByAddress }
	>;
	placementDocHeight: number;
	docWidth: number;
	fieldBoxCss: PlacementFieldRect;
	walletAddress: `0x${string}` | undefined;
	walletUsdcBalance: bigint;
};

function scheduleSendIdle(setSendStatus: RunEnvelopeSendArgs["setSendStatus"]) {
	setTimeout(() => setSendStatus("idle"), 3000);
}

function failSend(setSendStatus: RunEnvelopeSendArgs["setSendStatus"]) {
	setSendStatus("error");
	scheduleSendIdle(setSendStatus);
}

async function hydrateAttachments(
	createForm: CreateForm,
	setCreateForm: (form: CreateForm) => void,
	setSendStatus: RunEnvelopeSendArgs["setSendStatus"],
) {
	let drafts = createForm.attachmentPacketDrafts ?? [];
	if (drafts.length === 0) return drafts;

	try {
		drafts = await hydrateAttachmentPacketDrafts(createForm.draftId, drafts);
		setCreateForm({ ...createForm, attachmentPacketDrafts: drafts });
		return drafts;
	} catch (error) {
		showAppErrorToast(error);
		failSend(setSendStatus);
		return null;
	}
}

export async function runEnvelopeSend(
	args: RunEnvelopeSendArgs,
): Promise<void> {
	const {
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
		activeOrg,
		selfProfile,
		sendFile,
		signFile,
		markDraftSent,
		rpcQuery,
		ensureAcknowledged,
		prepareSelfSignCompletions,
		captureAppEvent,
		setCreateForm,
		setSendStatus,
		setPostSendShare,
		setPostSendWarmSummary,
		setPostSendDialogOpen,
		isSendingRef,
		onProgress,
		onSendProgressSuccess,
		closeSendProgress,
	} = args;

	const emit = (event: SendProgressEvent) => onProgress?.(event);

	if (validateEnvelopeDocuments(createForm.documents)) {
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}
	if (validateEnvelopeRecipients(createForm.recipients)) {
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}
	if (recipientProfilesLoading) {
		closeSendProgress?.();
		return;
	}

	const signerRecipients = createForm.recipients.filter(
		(r) => r.role === "signer",
	);
	const fieldFailure = validateSignerPlacementFields({
		signatureFields,
		signerRecipients,
	});
	if (fieldFailure) {
		reportEnvelopeSendValidationFailure(fieldFailure);
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}

	const profileFailure = validateRecipientProfiles({
		recipients: createForm.recipients,
		recipientProfilesMapWithRecipient,
		recipientProfilesLoading,
	});
	if (profileFailure) {
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}

	const attachmentComposeDrafts = await hydrateAttachments(
		createForm,
		setCreateForm,
		setSendStatus,
	);
	if (attachmentComposeDrafts === null) {
		closeSendProgress?.();
		return;
	}

	const settlementDraftsFailure = validateSettlementDraftsForSend({
		entitlements,
		settlementDrafts: createForm.settlementDrafts,
	});
	if (settlementDraftsFailure) {
		reportEnvelopeSendValidationFailure(settlementDraftsFailure);
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}

	const attachmentFailure = validateAttachmentPacketsForSend({
		entitlements,
		attachmentComposeDrafts,
		rosterEmails: rosterEmailsFromRecipients(createForm.recipients),
	});
	if (attachmentFailure) {
		reportEnvelopeSendValidationFailure(attachmentFailure);
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}

	const payoutBalanceFailure = validateSettlementPayoutBalance({
		settlementDrafts: createForm.settlementDrafts,
		walletAddress,
		walletBalance: walletUsdcBalance,
	});
	if (payoutBalanceFailure) {
		reportEnvelopeSendValidationFailure(payoutBalanceFailure);
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}

	captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeSendClicked, {
		recipient_count: createForm.recipients?.length ?? 0,
	});

	isSendingRef.current = true;
	setSendStatus("loading");

	try {
		emit({ phase: "preparing_documents", status: "start" });
		const docPayloads = await loadDocumentPayloads(createForm, signatureFields);
		emit({ phase: "preparing_documents", status: "done" });

		const hasSettlementDrafts = (createForm.settlementDrafts?.length ?? 0) > 0;
		if (hasSettlementDrafts) {
			emit({ phase: "resolving_payouts", status: "start" });
		}
		const resolvedSettlementDrafts = await resolveSettlementDrafts({
			createForm,
			rpcQuery,
		});
		if (!resolvedSettlementDrafts) {
			emit({
				phase: hasSettlementDrafts ? "resolving_payouts" : "building_payload",
				status: "error",
				errorMessage: "Could not prepare payout rules.",
			});
			setSendStatus("error");
			isSendingRef.current = false;
			scheduleSendIdle(setSendStatus);
			return;
		}
		if (hasSettlementDrafts) {
			emit({ phase: "resolving_payouts", status: "done" });
		}

		emit({ phase: "building_payload", status: "start" });
		const built = await buildEnvelopeSendPayload({
			createForm,
			signatureFields,
			entitlements,
			attachmentComposeDrafts,
			recipientProfilesMapWithRecipient,
			placementDocHeight,
			docWidth,
			fieldBoxCss,
			activeOrg,
			rpcQuery,
			docPayloads,
			resolvedSettlementDrafts,
		});

		if (built.routingValidationError) {
			reportRoutingValidationError(built.routingValidationError);
			emit({
				phase: "building_payload",
				status: "error",
				errorMessage: "Envelope routing could not be validated.",
			});
			setSendStatus("error");
			isSendingRef.current = false;
			scheduleSendIdle(setSendStatus);
			return;
		}
		emit({ phase: "building_payload", status: "done" });

		const result = await sendFile.mutateAsync(
			{
				...built.sendInput,
				onProgress: (event) => emit(event),
			},
			suppressGlobalErrorToast(),
		);

		await selfSignAfterSend({
			createForm,
			signatureFields,
			selfProfile,
			result,
			signFile,
			ensureAcknowledged,
			prepareSelfSignCompletions,
			setSendStatus,
			onProgress: emit,
		});

		onSendProgressSuccess?.();
		setSendStatus("success");

		if (createForm.serverDraftId && result.success && result.pieceCid) {
			void markDraftSent.mutateAsync({
				draftId: createForm.serverDraftId,
				pieceCid: result.pieceCid,
			});
		}

		trackEnvelopeSendSucceeded({
			captureAppEvent,
			coldRecipientCount: built.coldRecipients.length,
			result,
		});

		setPostSendShare(buildPostSendShare(result));
		setPostSendWarmSummary(buildPostSendWarmSummary(result, createForm));
		closeSendProgress?.();
		setPostSendDialogOpen(true);
	} catch (error) {
		setSendStatus("error");
		emit({
			phase: "send_failed",
			status: "error",
			errorMessage:
				error instanceof Error ? error.message : "Failed to send envelope.",
		});
		if (
			error instanceof Error &&
			error.message === SendEnvelopeError.MISSING_DRAFT_DOCUMENT
		) {
			scheduleSendIdle(setSendStatus);
			return;
		}
		if (error instanceof BaseError) {
			toastUser.error(formatSettlementSimError(error));
		} else {
			showAppErrorToast(error);
		}
		console.error("Failed to send documents:", error);
		scheduleSendIdle(setSendStatus);
	} finally {
		isSendingRef.current = false;
	}
}
