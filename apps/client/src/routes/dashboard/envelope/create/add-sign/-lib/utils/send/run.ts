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
import { toast } from "sonner";
import type { Address } from "viem";
import { BaseError } from "viem";
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
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
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
import {
	reportEnvelopeSendValidationFailure,
	rosterEmailsFromRecipients,
	validateAttachmentPacketsForSend,
	validateEnvelopeDocuments,
	validateEnvelopeRecipients,
	validateRecipientProfiles,
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
	captureAppEvent: CaptureAppEvent;
	setCreateForm: (form: CreateForm) => void;
	setSendStatus: (
		status: "idle" | "loading" | "signing" | "success" | "error",
	) => void;
	setPostSendShare: (share: ColdSharePackage | null) => void;
	setPostSendWarmSummary: (summary: WarmShareSummary | null) => void;
	setPostSendDialogOpen: (open: boolean) => void;
	isSendingRef: React.MutableRefObject<boolean>;
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
		toast.error(
			error instanceof Error
				? error.message
				: "Could not load supplementary files for send",
		);
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
		captureAppEvent,
		setCreateForm,
		setSendStatus,
		setPostSendShare,
		setPostSendWarmSummary,
		setPostSendDialogOpen,
		isSendingRef,
	} = args;

	if (validateEnvelopeDocuments(createForm.documents)) {
		failSend(setSendStatus);
		return;
	}
	if (validateEnvelopeRecipients(createForm.recipients)) {
		failSend(setSendStatus);
		return;
	}
	if (recipientProfilesLoading) {
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
		return;
	}

	const profileFailure = validateRecipientProfiles({
		recipients: createForm.recipients,
		recipientProfilesMapWithRecipient,
		recipientProfilesLoading,
	});
	if (profileFailure) {
		failSend(setSendStatus);
		return;
	}

	const attachmentComposeDrafts = await hydrateAttachments(
		createForm,
		setCreateForm,
		setSendStatus,
	);
	if (attachmentComposeDrafts === null) return;

	const attachmentFailure = validateAttachmentPacketsForSend({
		entitlements,
		attachmentComposeDrafts,
		rosterEmails: rosterEmailsFromRecipients(createForm.recipients),
	});
	if (attachmentFailure) {
		reportEnvelopeSendValidationFailure(attachmentFailure);
		failSend(setSendStatus);
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
		return;
	}

	captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeSendClicked, {
		recipient_count: createForm.recipients?.length ?? 0,
	});

	isSendingRef.current = true;
	setSendStatus("loading");

	try {
		const docPayloads = await loadDocumentPayloads(createForm, signatureFields);
		const resolvedSettlementDrafts = await resolveSettlementDrafts({
			createForm,
			rpcQuery,
		});
		if (!resolvedSettlementDrafts) {
			setSendStatus("error");
			isSendingRef.current = false;
			scheduleSendIdle(setSendStatus);
			return;
		}

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
			setSendStatus("error");
			isSendingRef.current = false;
			scheduleSendIdle(setSendStatus);
			return;
		}

		const result = await sendFile.mutateAsync(
			built.sendInput,
			suppressGlobalErrorToast(),
		);

		await selfSignAfterSend({
			createForm,
			signatureFields,
			selfProfile,
			result,
			signFile,
			setSendStatus,
		});

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
		setPostSendDialogOpen(true);
	} catch (error) {
		setSendStatus("error");
		if (
			error instanceof Error &&
			error.message === SendEnvelopeError.MISSING_DRAFT_DOCUMENT
		) {
			scheduleSendIdle(setSendStatus);
			return;
		}
		if (error instanceof BaseError) {
			toast.error(formatSettlementSimError(error));
		} else {
			showAppErrorToast(error);
		}
		console.error("Failed to send documents:", error);
		scheduleSendIdle(setSendStatus);
	} finally {
		isSendingRef.current = false;
	}
}
