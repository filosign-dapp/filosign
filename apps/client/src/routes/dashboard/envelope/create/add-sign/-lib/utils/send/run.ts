import type { FilosignRpcQueryUtils } from "@filosign/react";
import {
	type CaptureAppEvent,
	CLIENT_ANALYTICS_EVENTS,
} from "@filosign/react/analytics";
import type { EntitlementsSnapshot } from "@filosign/react/billing";
import {
	formatSettlementSimError,
	mergeSendFileIncompleteSteps,
	type SendFileArgs,
	type SendFileIncompleteStep,
	type SendFileResult,
	type SendFileResume,
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
import { BaseError, getAddress, isAddress } from "viem";
import { toastUser } from "@/src/lib/copy/toast";
import { hydrateAttachmentPacketDrafts } from "@/src/lib/domains/drafts";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import type { PlacementFieldRect } from "@/src/lib/domains/files/field-box";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import { suppressGlobalErrorToast } from "@/src/lib/errors";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";
import { readSafePendingQueue, treasuryChainId } from "@/src/lib/web3/treasury";
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
	validateAttachmentPacketsForSend,
	validateSatelliteContractRulesForSend,
	validateSettlementDraftsForSend,
	validateTreasuryPayerForSend,
} from "./entitlement-guards";
import type { SendProgressEvent } from "./progress";
import type { SendSession } from "./session";
import { createSendSession, mergeSendSessionIncompleteSteps } from "./session";
import {
	reportEnvelopeSendValidationFailure,
	rosterEmailsFromRecipients,
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
	setPostSendIncompleteSteps: (steps: SendFileIncompleteStep[] | null) => void;
	setPostSendDialogOpen: (open: boolean) => void;
	isSendingRef: React.MutableRefObject<boolean>;
	onProgress?: (event: SendProgressEvent) => void;
	onSendProgressSuccess?: () => void;
	closeSendProgress?: () => void;
	sendSessionRef?: React.MutableRefObject<SendSession | null>;
	onPartialPostSendUpdate?: (
		ctx: {
			pieceCid: string;
			incompleteSteps?: SendFileIncompleteStep[];
		} | null,
	) => void;
	getPartialPostSendPieceCid?: () => string | undefined;
	preRegisterCacheRef?: React.MutableRefObject<SendFileResume | null>;
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
	connectedWalletAddress?: Address;
	registerSettlementRules?: SendFileArgs["registerSettlementRules"];
	orgWalletAddress?: string | null;
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

function rememberSendSession(args: {
	result: SendFileResult;
	sendSessionRef?: React.MutableRefObject<SendSession | null>;
	onPartialPostSendUpdate?: EnvelopeSendDeps["onPartialPostSendUpdate"];
}) {
	if (!args.result.postSendRetryPayload || !args.sendSessionRef) return;
	args.sendSessionRef.current = createSendSession({
		pieceCid: args.result.pieceCid,
		incompleteSteps: args.result.incompleteSteps ?? [],
		postSendPayload: args.result.postSendRetryPayload,
	});
	args.onPartialPostSendUpdate?.({
		pieceCid: args.result.pieceCid,
		incompleteSteps: args.result.incompleteSteps,
	});
}

function reportPostSendIncomplete(args: {
	setSendStatus: RunEnvelopeSendArgs["setSendStatus"];
	emit: (event: SendProgressEvent) => void;
	errorMessage: string;
}) {
	args.setSendStatus("error");
	args.emit({
		phase: "send_failed",
		status: "error",
		errorMessage: args.errorMessage,
	});
	scheduleSendIdle(args.setSendStatus);
}

async function validateSatellitesBeforeSend(args: {
	createForm: CreateForm;
	rpcQuery: FilosignRpcQueryUtils;
	attachmentComposeDrafts: AttachmentPacketComposeDraft[];
	connectedWalletAddress?: Address;
	orgWalletAddress?: string | null;
}): Promise<
	| { ok: true; preResolvedSettlementDrafts?: SettlementAttachmentDraft[] }
	| { ok: false }
> {
	const hasSettlementDrafts =
		(args.createForm.settlementDrafts?.length ?? 0) > 0;
	const hasConditionalAttachments = args.attachmentComposeDrafts.some(
		(draft) => draft.releaseMode === "conditional",
	);
	if (!hasSettlementDrafts && !hasConditionalAttachments) {
		return { ok: true };
	}

	let preResolvedSettlementDrafts: SettlementAttachmentDraft[] | undefined;
	if (hasSettlementDrafts) {
		const resolved = await resolveSettlementDrafts({
			createForm: args.createForm,
			rpcQuery: args.rpcQuery,
		});
		if (!resolved) {
			reportEnvelopeSendValidationFailure({
				kind: "toast",
				title: "Check payout setup",
				hint: "Could not prepare payout rules. Recipients may need a linked Filosign wallet.",
			});
			return { ok: false };
		}
		preResolvedSettlementDrafts = resolved;
	}

	const satelliteContractFailure = validateSatelliteContractRulesForSend({
		settlementDrafts:
			preResolvedSettlementDrafts ?? args.createForm.settlementDrafts,
		attachmentComposeDrafts: args.attachmentComposeDrafts,
		recipients: args.createForm.recipients,
		registerRouting: args.createForm.registerRouting,
		payoutPayerSource: args.createForm.payoutPayerSource,
		connectedWalletAddress: args.connectedWalletAddress,
		orgWalletAddress: args.orgWalletAddress,
	});
	if (satelliteContractFailure) {
		reportEnvelopeSendValidationFailure(satelliteContractFailure);
		return { ok: false };
	}

	return { ok: true, preResolvedSettlementDrafts };
}

function finishSuccessfulSend(args: {
	result: SendFileResult;
	createForm: CreateForm;
	sendSessionRef?: React.MutableRefObject<SendSession | null>;
	onPartialPostSendUpdate?: EnvelopeSendDeps["onPartialPostSendUpdate"];
	onSendProgressSuccess?: () => void;
	setSendStatus: RunEnvelopeSendArgs["setSendStatus"];
	setPostSendShare: EnvelopeSendDeps["setPostSendShare"];
	setPostSendWarmSummary: EnvelopeSendDeps["setPostSendWarmSummary"];
	setPostSendIncompleteSteps: EnvelopeSendDeps["setPostSendIncompleteSteps"];
	closeSendProgress?: () => void;
	setPostSendDialogOpen: EnvelopeSendDeps["setPostSendDialogOpen"];
	onClearPreRegisterCache?: () => void;
}) {
	if (args.sendSessionRef) {
		args.sendSessionRef.current = null;
	}
	args.onPartialPostSendUpdate?.(null);
	args.onClearPreRegisterCache?.();
	args.onSendProgressSuccess?.();
	args.setSendStatus("success");
	args.setPostSendShare(buildPostSendShare(args.result));
	args.setPostSendWarmSummary(
		buildPostSendWarmSummary(args.result, args.createForm),
	);
	args.setPostSendIncompleteSteps(args.result.incompleteSteps ?? null);
	args.closeSendProgress?.();
	args.setPostSendDialogOpen(true);
}

function handleRegisteredEnvelopeFailure(args: {
	error: unknown;
	createForm: CreateForm;
	registeredPieceCid: string;
	incompleteSteps?: SendFileIncompleteStep[];
	setSendStatus: RunEnvelopeSendArgs["setSendStatus"];
	setPostSendShare: EnvelopeSendDeps["setPostSendShare"];
	setPostSendWarmSummary: EnvelopeSendDeps["setPostSendWarmSummary"];
	setPostSendIncompleteSteps: EnvelopeSendDeps["setPostSendIncompleteSteps"];
	emit: (event: SendProgressEvent) => void;
}): boolean {
	const partialResult: SendFileResult = {
		success: true,
		pieceCid: args.registeredPieceCid,
		...(args.incompleteSteps?.length
			? { incompleteSteps: args.incompleteSteps }
			: {}),
	};
	args.setPostSendShare(buildPostSendShare(partialResult));
	args.setPostSendWarmSummary(
		buildPostSendWarmSummary(partialResult, args.createForm),
	);
	args.setPostSendIncompleteSteps(args.incompleteSteps ?? null);
	reportPostSendIncomplete({
		setSendStatus: args.setSendStatus,
		emit: args.emit,
		errorMessage:
			args.error instanceof Error
				? args.error.message
				: "Envelope sent, but a follow-up step failed.",
	});
	return true;
}

function abortIfSendPrerequisitesInvalid(args: {
	createForm: CreateForm;
	signatureFields: SignatureField[];
	recipientProfilesLoading: boolean;
	recipientProfilesMapWithRecipient: RunEnvelopeSendArgs["recipientProfilesMapWithRecipient"];
	setSendStatus: RunEnvelopeSendArgs["setSendStatus"];
	closeSendProgress?: () => void;
}): boolean {
	if (validateEnvelopeDocuments(args.createForm.documents)) {
		failSend(args.setSendStatus);
		args.closeSendProgress?.();
		return true;
	}
	if (validateEnvelopeRecipients(args.createForm.recipients)) {
		failSend(args.setSendStatus);
		args.closeSendProgress?.();
		return true;
	}
	if (args.recipientProfilesLoading) {
		args.closeSendProgress?.();
		return true;
	}

	const signerRecipients = args.createForm.recipients.filter(
		(r) => r.role === "signer",
	);
	const fieldFailure = validateSignerPlacementFields({
		signatureFields: args.signatureFields,
		signerRecipients,
	});
	if (fieldFailure) {
		reportEnvelopeSendValidationFailure(fieldFailure);
		failSend(args.setSendStatus);
		args.closeSendProgress?.();
		return true;
	}

	const profileFailure = validateRecipientProfiles({
		recipients: args.createForm.recipients,
		recipientProfilesMapWithRecipient: args.recipientProfilesMapWithRecipient,
		recipientProfilesLoading: args.recipientProfilesLoading,
	});
	if (profileFailure) {
		failSend(args.setSendStatus);
		args.closeSendProgress?.();
		return true;
	}

	return false;
}

function buildSendFileMutationArgs(args: {
	builtSendInput: SendFileArgs;
	createForm: CreateForm;
	settlementPayerAddress: Address | undefined;
	registerSettlementRules?: SendFileArgs["registerSettlementRules"];
	emit: (event: SendProgressEvent) => void;
	preRegisterCacheRef?: React.MutableRefObject<SendFileResume | null>;
}): SendFileArgs {
	return {
		...args.builtSendInput,
		settlementPayerAddress: args.settlementPayerAddress,
		payoutPayerSource: args.createForm.payoutPayerSource ?? "sender",
		registerSettlementRules: args.registerSettlementRules,
		onProgress: (event) => args.emit(event),
		...(args.preRegisterCacheRef?.current
			? { resume: args.preRegisterCacheRef.current }
			: {}),
		onPreparedPiece: (piece) => {
			if (args.preRegisterCacheRef) {
				args.preRegisterCacheRef.current = { preparedPiece: piece };
			}
		},
		onUploadCompleted: () => {
			if (!args.preRegisterCacheRef?.current) return;
			args.preRegisterCacheRef.current = {
				...args.preRegisterCacheRef.current,
				uploadCompleted: true,
			};
		},
	};
}

async function completeSendAfterRegister(args: {
	result: SendFileResult;
	createForm: CreateForm;
	signatureFields: SignatureField[];
	selfProfile: UserProfile | undefined;
	signFile: EnvelopeSendDeps["signFile"];
	ensureAcknowledged: EnvelopeSendDeps["ensureAcknowledged"];
	prepareSelfSignCompletions: EnvelopeSendDeps["prepareSelfSignCompletions"];
	setSendStatus: RunEnvelopeSendArgs["setSendStatus"];
	emit: (event: SendProgressEvent) => void;
	sendSessionRef?: React.MutableRefObject<SendSession | null>;
	onPartialPostSendUpdate?: EnvelopeSendDeps["onPartialPostSendUpdate"];
	markDraftSent: EnvelopeSendDeps["markDraftSent"];
	captureAppEvent: EnvelopeSendDeps["captureAppEvent"];
	coldRecipientCount: number;
	onSendProgressSuccess?: () => void;
	setPostSendShare: EnvelopeSendDeps["setPostSendShare"];
	setPostSendWarmSummary: EnvelopeSendDeps["setPostSendWarmSummary"];
	setPostSendIncompleteSteps: EnvelopeSendDeps["setPostSendIncompleteSteps"];
	closeSendProgress?: () => void;
	setPostSendDialogOpen: EnvelopeSendDeps["setPostSendDialogOpen"];
	clearPreRegisterCache: () => void;
}): Promise<void> {
	if (args.createForm.serverDraftId && args.result.pieceCid) {
		void args.markDraftSent.mutateAsync({
			draftId: args.createForm.serverDraftId,
			pieceCid: args.result.pieceCid,
		});
	}

	trackEnvelopeSendSucceeded({
		captureAppEvent: args.captureAppEvent,
		coldRecipientCount: args.coldRecipientCount,
		result: args.result,
	});

	const selfSignResult = await selfSignAfterSend({
		createForm: args.createForm,
		signatureFields: args.signatureFields,
		selfProfile: args.selfProfile,
		result: args.result,
		signFile: args.signFile,
		ensureAcknowledged: args.ensureAcknowledged,
		prepareSelfSignCompletions: args.prepareSelfSignCompletions,
		setSendStatus: args.setSendStatus,
		onProgress: args.emit,
	});

	if (
		selfSignResult.attempted &&
		!selfSignResult.ok &&
		args.sendSessionRef?.current
	) {
		args.sendSessionRef.current = mergeSendSessionIncompleteSteps(
			args.sendSessionRef.current,
			["self_sign"],
		);
		args.onPartialPostSendUpdate?.({
			pieceCid: args.sendSessionRef.current.pieceCid,
			incompleteSteps: args.sendSessionRef.current.incompleteSteps,
		});
	}

	const incompleteSteps = mergeSendFileIncompleteSteps(
		args.result.incompleteSteps,
		args.sendSessionRef?.current?.incompleteSteps,
	);

	if (incompleteSteps.length > 0) {
		reportPostSendIncomplete({
			setSendStatus: args.setSendStatus,
			emit: args.emit,
			errorMessage: "Envelope sent, but some follow-up steps did not finish.",
		});
		return;
	}

	finishSuccessfulSend({
		result: args.result,
		createForm: args.createForm,
		sendSessionRef: args.sendSessionRef,
		onPartialPostSendUpdate: args.onPartialPostSendUpdate,
		onSendProgressSuccess: args.onSendProgressSuccess,
		setSendStatus: args.setSendStatus,
		setPostSendShare: args.setPostSendShare,
		setPostSendWarmSummary: args.setPostSendWarmSummary,
		setPostSendIncompleteSteps: args.setPostSendIncompleteSteps,
		closeSendProgress: args.closeSendProgress,
		setPostSendDialogOpen: args.setPostSendDialogOpen,
		onClearPreRegisterCache: args.clearPreRegisterCache,
	});
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
		connectedWalletAddress,
		registerSettlementRules,
		orgWalletAddress,
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
		setPostSendIncompleteSteps,
		setPostSendDialogOpen,
		isSendingRef,
		onProgress,
		onSendProgressSuccess,
		closeSendProgress,
		sendSessionRef,
		onPartialPostSendUpdate,
		getPartialPostSendPieceCid,
		preRegisterCacheRef,
	} = args;

	const emit = (event: SendProgressEvent) => onProgress?.(event);

	const clearPreRegisterCache = () => {
		if (preRegisterCacheRef) {
			preRegisterCacheRef.current = null;
		}
	};

	if (sendSessionRef?.current?.pieceCid) {
		emit({
			phase: "send_failed",
			status: "error",
			errorMessage:
				"Envelope already sent. Retry remaining steps instead of sending again.",
		});
		failSend(setSendStatus);
		return;
	}

	if (
		abortIfSendPrerequisitesInvalid({
			createForm,
			signatureFields,
			recipientProfilesLoading,
			recipientProfilesMapWithRecipient,
			setSendStatus,
			closeSendProgress,
		})
	) {
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
		recipients: createForm.recipients,
		registerRouting: createForm.registerRouting,
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
		recipients: createForm.recipients,
		registerRouting: createForm.registerRouting,
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

	const treasuryPayerFailure = validateTreasuryPayerForSend({
		payoutPayerSource: createForm.payoutPayerSource,
		orgWalletAddress,
		connectedWalletAddress,
		registerSettlementRules,
		hasSettlementDrafts: (createForm.settlementDrafts?.length ?? 0) > 0,
		entitlements,
	});
	if (treasuryPayerFailure) {
		reportEnvelopeSendValidationFailure(treasuryPayerFailure);
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}

	const satellitePreSend = await validateSatellitesBeforeSend({
		createForm,
		rpcQuery,
		attachmentComposeDrafts,
		connectedWalletAddress,
		orgWalletAddress,
	});
	if (!satellitePreSend.ok) {
		failSend(setSendStatus);
		closeSendProgress?.();
		return;
	}
	const preResolvedSettlementDrafts =
		satellitePreSend.preResolvedSettlementDrafts;

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
			emit({ phase: "resolving_payouts", status: "done" });
		}
		const resolvedSettlementDrafts =
			preResolvedSettlementDrafts ??
			(await resolveSettlementDrafts({
				createForm,
				rpcQuery,
			}));
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

		if (
			createForm.payoutPayerSource === "org_wallet" &&
			orgWalletAddress &&
			isAddress(orgWalletAddress) &&
			walletAddress?.toLowerCase() !== orgWalletAddress.toLowerCase()
		) {
			const queue = await readSafePendingQueue(
				getAddress(orgWalletAddress) as `0x${string}`,
				treasuryChainId(),
			);
			if (queue.pendingCount > 0) {
				const blocker =
					queue.firstPendingNonce == null
						? "Treasury has pending multisig transactions."
						: `Treasury has pending nonce ${queue.firstPendingNonce}.`;
				throw new Error(
					queue.explorerUrl
						? `${blocker} Resolve pending transactions in Safe first: ${queue.explorerUrl}`
						: blocker,
				);
			}
		}

		const settlementPayerAddress =
			createForm.payoutPayerSource === "org_wallet" &&
			orgWalletAddress &&
			isAddress(orgWalletAddress)
				? getAddress(orgWalletAddress)
				: walletAddress;

		const result = await sendFile.mutateAsync(
			buildSendFileMutationArgs({
				builtSendInput: built.sendInput,
				createForm,
				settlementPayerAddress,
				registerSettlementRules,
				emit,
				preRegisterCacheRef,
			}),
			suppressGlobalErrorToast(),
		);

		if (result.postSendRetryPayload && sendSessionRef) {
			rememberSendSession({
				result,
				sendSessionRef,
				onPartialPostSendUpdate,
			});
			clearPreRegisterCache();
		}

		await completeSendAfterRegister({
			result,
			createForm,
			signatureFields,
			selfProfile,
			signFile,
			ensureAcknowledged,
			prepareSelfSignCompletions,
			setSendStatus,
			emit,
			sendSessionRef,
			onPartialPostSendUpdate,
			markDraftSent,
			captureAppEvent,
			coldRecipientCount: built.coldRecipients.length,
			onSendProgressSuccess,
			setPostSendShare,
			setPostSendWarmSummary,
			setPostSendIncompleteSteps,
			closeSendProgress,
			setPostSendDialogOpen,
			clearPreRegisterCache,
		});
	} catch (error) {
		const registeredPieceCid =
			getPartialPostSendPieceCid?.() ?? sendSessionRef?.current?.pieceCid;
		if (
			registeredPieceCid &&
			handleRegisteredEnvelopeFailure({
				error,
				createForm,
				registeredPieceCid,
				incompleteSteps: sendSessionRef?.current?.incompleteSteps,
				setSendStatus,
				setPostSendShare,
				setPostSendWarmSummary,
				setPostSendIncompleteSteps,
				emit,
			})
		) {
			return;
		}

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
