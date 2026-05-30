import { useFilosignContext } from "@filosign/react";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useCryptoUnlocked } from "@filosign/react/auth";
import { useEntitlements } from "@filosign/react/billing";
import { useMarkDraftSent } from "@filosign/react/drafts";
import { canUseAdvancedSettlements, useSendFile } from "@filosign/react/files";
import { useActiveOrganization } from "@filosign/react/orgs";
import { useProfilesByAddresses } from "@filosign/react/users";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Address, Hex } from "viem";
import {
	draftSyncModeFromSearch,
	pruneSignatureFields,
	useDraftDocumentPreview,
	useServerDraftHydrate,
} from "@/src/lib/domains/drafts";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { constrainFieldTopLeft } from "@/src/lib/domains/files/placement-viewport";
import type { ColdSharePackage } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import { buildColdInviteMagicLink } from "@/src/lib/domains/invites/cold-invite-search";
import { buildRegisterRoutingFromForm } from "@/src/lib/domains/settlements/build-routing-input";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";
import type {
	FieldPlacementConfirmPayload,
	FieldPlacementSignerOption,
} from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-dialog";
import { useDocumentDimensions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-dimensions";
import { useSignatureFields } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-fields";
import type { Document } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { buildSettlementRulesForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/build-settlement-rules";
import { signatureFieldBoxCssPx } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-box";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";
import { resolveSettlementDraftsForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/resolve-settlement-drafts";
import {
	buildPlacementManifestForDocument,
	buildSignersAndViewersForDocument,
	isColdRecipient,
	loadDocumentFileBytes,
	type RecipientWithEncryptionProfile,
	recipientResolvedSignerAddress,
	SendEnvelopeError,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";
import { collectViewerEmails } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/viewer-emails";

const addSignRouteApi = getRouteApi("/dashboard/envelope/create/add-sign/");

export function useAddSignController() {
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
	const persistHydrated = useStorePersistHydrated();
	const draftReady = Boolean(createForm?.documents?.length);
	const { documentUrls, documentPdfBytes } = useDraftDocumentPreview({
		createForm,
		draftSyncMode,
		serverDraftLoadState,
	});
	const captureAppEvent = useCaptureAppEvent();
	const sendFile = useSendFile();
	const markDraftSent = useMarkDraftSent();
	const { data: entitlements } = useEntitlements();
	const { rpcQuery } = useFilosignContext();
	const activeOrg = useActiveOrganization();

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
			{
				recipient: Recipient;
				profile: { encryptionPublicKey: string; [key: string]: unknown };
			}
		>();
		createForm?.recipients?.forEach((recipient) => {
			const addr = recipientResolvedSignerAddress(recipient);
			if (!addr) return;
			const profile = recipientProfilesMap?.get(addr);
			if (profile) {
				map.set(addr, {
					recipient,
					profile: profile as {
						encryptionPublicKey: string;
						[key: string]: unknown;
					},
				});
			}
		});
		return map;
	}, [createForm?.recipients, recipientProfilesMap]);

	const {
		width: docWidth,
		height: docHeight,
		isMobile,
	} = useDocumentDimensions();
	const fieldBoxCss = signatureFieldBoxCssPx(isMobile);
	const [pdfLayoutHeight, setPdfLayoutHeight] = useState<number | null>(null);
	const placementDocHeight = pdfLayoutHeight ?? docHeight;
	const [currentDocumentId, setCurrentDocumentId] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [zoom, setZoom] = useState(100);
	const [sendStatus, setSendStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [postSendDialogOpen, setPostSendDialogOpen] = useState(false);
	const [postSendShare, setPostSendShare] = useState<ColdSharePackage | null>(
		null,
	);
	const isSendingRef = useRef(false);

	const suppressEmptyDraftRedirect =
		sendStatus === "loading" ||
		sendStatus === "success" ||
		postSendDialogOpen ||
		serverDraftLoadState === "loading" ||
		serverDraftLoadState === "awaiting_crypto" ||
		Boolean(pendingServerDraftId && !draftReady);

	const signatureFields = useMemo(
		() =>
			createForm
				? pruneSignatureFields(
						createForm.signatureFields ?? [],
						createForm.recipients,
					)
				: [],
		[createForm],
	);

	const handleSignatureFieldsChange = useCallback(
		(fields: SignatureField[]) => {
			const prev = useStorePersist.getState().createForm;
			if (!prev) return;
			setCreateForm({ ...prev, signatureFields: fields });
		},
		[setCreateForm],
	);

	const {
		selectedField,
		isPlacingField,
		pendingFieldType,
		setSelectedField,
		handleAddField,
		handleFieldPlaced: placeField,
		handleFieldRemove,
		handleFieldUpdate,
		cancelPlacement,
	} = useSignatureFields(signatureFields, handleSignatureFieldsChange);

	const placementCommittedRef = useRef(false);
	const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
	const [placementCoords, setPlacementCoords] = useState<{
		x: number;
		y: number;
		page: number;
	} | null>(null);

	const signerOptionsForPlacement =
		useMemo((): FieldPlacementSignerOption[] => {
			if (!createForm?.recipients?.length) return [];
			return createForm.recipients
				.filter((r) => r.role === "signer")
				.map((r) => {
					const raw = r.email?.trim();
					if (!raw) return null;
					const email = normalizePlacementRecipientEmail(raw);
					const addr = recipientResolvedSignerAddress(r);
					const name = r.name?.trim() || "Signer";
					const label = addr
						? `${name} · ${email}`
						: `${name} · ${email} (invite)`;
					return {
						email,
						name,
						walletAddress: addr ?? undefined,
						label,
					};
				})
				.filter((x): x is NonNullable<typeof x> => x !== null);
		}, [createForm?.recipients]);

	const documents: Document[] = useMemo(
		() =>
			(createForm?.documents ?? []).map((doc) => ({
				id: doc.id,
				name: doc.name,
				mimeType: doc.type,
				url: documentUrls[doc.id] ?? "",
				pdfBytes: documentPdfBytes[doc.id],
				pages: 1,
			})),
		[createForm?.documents, documentUrls, documentPdfBytes],
	);

	useEffect(() => {
		if (!persistHydrated) return;
		if (!draftReady && !suppressEmptyDraftRedirect) {
			navigate({
				to: "/dashboard/envelope/create",
				replace: true,
			});
		}
	}, [persistHydrated, draftReady, suppressEmptyDraftRedirect, navigate]);

	useEffect(() => {
		if (documents.length > 0 && !currentDocumentId) {
			setCurrentDocumentId(documents[0].id);
		}
	}, [documents, currentDocumentId]);

	useEffect(() => {
		setPdfLayoutHeight(null);
	}, [currentDocumentId]);

	const currentDocument: Document | undefined = documents.find(
		(doc) => doc.id === currentDocumentId,
	);

	const handleFieldPlacementRequest = useCallback(
		(coords: { x: number; y: number; page: number }) => {
			if (!pendingFieldType || !currentDocumentId) return;
			if (signerOptionsForPlacement.length === 0) {
				cancelPlacement();
				return;
			}
			setPlacementCoords(coords);
			setPlacementDialogOpen(true);
		},
		[
			pendingFieldType,
			currentDocumentId,
			signerOptionsForPlacement.length,
			cancelPlacement,
		],
	);

	const handlePlacementDialogOpenChange = useCallback(
		(open: boolean) => {
			setPlacementDialogOpen(open);
			if (!open) {
				setPlacementCoords(null);
				if (!placementCommittedRef.current) {
					cancelPlacement();
				}
				placementCommittedRef.current = false;
			}
		},
		[cancelPlacement],
	);

	const handlePlacementConfirm = useCallback(
		(payload: FieldPlacementConfirmPayload) => {
			if (!placementCoords || !pendingFieldType || !currentDocumentId) return;
			placementCommittedRef.current = true;
			const fieldConfig = signatureFieldPalette.find(
				(config) => config.type === pendingFieldType,
			);
			if (!fieldConfig) return;
			const { x, y } = constrainFieldTopLeft({
				x: placementCoords.x,
				y: placementCoords.y,
				docWidth,
				docHeight: placementDocHeight,
				fieldWidth: fieldBoxCss.width,
				fieldHeight: fieldBoxCss.height,
			});
			placeField(x, y, placementCoords.page, currentDocumentId, {
				label: fieldConfig.label,
				assignedSignerWallet: payload.assignedSignerWallet,
				assignedSignerName: payload.assignedSignerName,
				assignedSignerEmail: payload.assignedSignerEmail,
				required: payload.required,
			});
		},
		[
			placementCoords,
			pendingFieldType,
			currentDocumentId,
			placeField,
			docWidth,
			placementDocHeight,
			fieldBoxCss,
		],
	);

	const placementFieldTypeLabel = useMemo(() => {
		if (!pendingFieldType) return "Field";
		return (
			signatureFieldPalette.find((c) => c.type === pendingFieldType)?.label ??
			pendingFieldType
		);
	}, [pendingFieldType]);

	const handleFieldSelect = useCallback(
		(fieldId: string) => setSelectedField(fieldId),
		[setSelectedField],
	);

	const handleBack = useCallback(() => {
		navigate({ to: "/dashboard/envelope/create" });
	}, [navigate]);

	const handleSend = useCallback(async () => {
		if (isSendingRef.current) {
			return;
		}

		if (!createForm?.documents.length) {
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		if (createForm.documents.length !== 1) {
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		if (!createForm.recipients || createForm.recipients.length === 0) {
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		const signerRecipients = createForm.recipients.filter(
			(r) => r.role === "signer",
		);
		if (signerRecipients.length === 0) {
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		const unresolvedSignerEmails = signerRecipients.filter(
			(r) => !r.email?.trim(),
		);
		if (unresolvedSignerEmails.length > 0) {
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		const coldRecipients = createForm.recipients.filter(isColdRecipient);
		for (const signer of signerRecipients) {
			const signerEmail = normalizePlacementRecipientEmail(
				signer.email?.trim() ?? "",
			);
			const signerFields = signatureFields.filter(
				(f) =>
					normalizePlacementRecipientEmail(f.assignedSignerEmail) ===
					signerEmail,
			);
			if (signerFields.length === 0) {
				setSendStatus("error");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
			if (!signerFields.some((f) => f.required)) {
				setSendStatus("error");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
		}

		if (recipientProfilesLoading) {
			return;
		}

		const missingProfiles = createForm.recipients.filter((r) => {
			const addr = recipientResolvedSignerAddress(r);
			if (!addr) return false;
			return !recipientProfilesMapWithRecipient.has(addr);
		});
		if (missingProfiles.length > 0) {
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeSendClicked, {
			recipient_count: createForm.recipients?.length ?? 0,
		});

		isSendingRef.current = true;
		setSendStatus("loading");

		try {
			const doc = createForm.documents[0];
			if (!doc) {
				throw new Error("No document to send");
			}
			const fileData = await loadDocumentFileBytes(createForm.draftId, doc);

			const { signers, viewers } = buildSignersAndViewersForDocument({
				recipients: createForm.recipients,
				recipientMap: recipientProfilesMapWithRecipient as Map<
					Address,
					RecipientWithEncryptionProfile
				>,
			});

			const coldInvitePayload =
				coldRecipients.length > 0
					? coldRecipients.map((r) => ({
							email: r.email.trim(),
							isSigner: r.role === "signer",
						}))
					: undefined;

			const viewerEmails = collectViewerEmails({
				recipients: createForm.recipients ?? [],
				coldInvites: coldInvitePayload,
			});

			const placementManifest = buildPlacementManifestForDocument({
				docId: doc.id,
				signerEmailsInOrder: signerRecipients.map((s) =>
					normalizePlacementRecipientEmail(s.email?.trim() ?? ""),
				),
				signatureFields,
				docWidth,
				docHeight: placementDocHeight,
				fieldBox: fieldBoxCss,
			});

			let resolvedSettlementDrafts: SettlementAttachmentDraft[];
			try {
				resolvedSettlementDrafts = await resolveSettlementDraftsForSend({
					drafts: createForm.settlementDrafts ?? [],
					recipients: createForm.recipients,
					lookupProfile: async (email) => {
						try {
							const profile = await rpcQuery.users.profile.lookup.call({
								query: email,
							});
							return { walletAddress: profile.walletAddress };
						} catch {
							return null;
						}
					},
				});
			} catch (err) {
				console.error(err);
				setSendStatus("error");
				isSendingRef.current = false;
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}

			const settlementRules = buildSettlementRulesForSend({
				drafts: resolvedSettlementDrafts,
				recipients: createForm.recipients,
				combineLegs: createForm.combineSettlementLegs,
				canUseAdvancedSettlements: canUseAdvancedSettlements(entitlements),
			});

			const routing = buildRegisterRoutingFromForm({
				recipients: createForm.recipients,
				routing: createForm.registerRouting,
			});

			const result = await sendFile.mutateAsync({
				signers,
				viewers,
				bytes: fileData,
				metadata: { name: doc.name },
				placementManifest,
				viewerEmails,
				...(coldInvitePayload ? { coldInvites: coldInvitePayload } : {}),
				...(settlementRules.length > 0 ? { settlementRules } : {}),
				...(routing ? { routing } : {}),
				...(activeOrg
					? {
							organizationId: activeOrg.id,
							orgEncryptionPublicKey: activeOrg.encryptionPublicKey as Hex,
						}
					: {}),
			});

			setSendStatus("success");

			if (createForm.serverDraftId && result.success && result.pieceCid) {
				void markDraftSent.mutateAsync({
					draftId: createForm.serverDraftId,
					pieceCid: result.pieceCid,
				});
			}

			captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeSendSucceeded, {
				had_cold_recipients: coldRecipients.length > 0,
				...(result.success && result.pieceCid
					? { piece_cid: result.pieceCid }
					: {}),
			});

			const shareCode =
				"coldInviteShareCode" in result && result.coldInviteShareCode
					? {
							emails: result.coldInviteShareCode.emails,
							phrase: result.coldInviteShareCode.phrase,
							magicLink: buildColdInviteMagicLink(window.location.origin, {
								pieceCid: result.pieceCid,
								inviteToken: result.coldInviteShareCode.inviteToken,
							}),
						}
					: null;

			setPostSendShare(shareCode);
			setPostSendDialogOpen(true);
		} catch (error) {
			setSendStatus("error");
			if (
				error instanceof Error &&
				error.message === SendEnvelopeError.MISSING_DRAFT_DOCUMENT
			) {
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
			console.error("Failed to send documents:", error);
			setTimeout(() => setSendStatus("idle"), 3000);
		} finally {
			isSendingRef.current = false;
		}
	}, [
		activeOrg,
		captureAppEvent,
		clearCreateForm,
		createForm,
		placementDocHeight,
		docWidth,
		fieldBoxCss,
		navigate,
		recipientProfilesLoading,
		recipientProfilesMapWithRecipient,
		sendFile,
		signatureFields,
		rpcQuery,
	]);

	const currentPageFields = useMemo(
		() =>
			signatureFields.filter(
				(field) =>
					field.documentId === currentDocumentId && field.page === currentPage,
			),
		[signatureFields, currentDocumentId, currentPage],
	);

	const handleDocumentSelect = useCallback(
		(documentId: string) => {
			setCurrentDocumentId(documentId);
			setCurrentPage(1);
			setSelectedField(null);
		},
		[setSelectedField],
	);

	const handlePostSendDone = useCallback(() => {
		setPostSendDialogOpen(false);
		setPostSendShare(null);
		clearCreateForm();
		navigate({ to: "/dashboard" });
	}, [clearCreateForm, navigate]);

	return {
		persistHydrated,
		draftReady,
		documents,
		currentDocument,
		currentDocumentId,
		currentPage,
		currentPageFields,
		zoom,
		setZoom,
		setCurrentPage,
		sendStatus,
		postSendDialogOpen,
		postSendShare,
		suppressEmptyDraftRedirect,
		selectedField,
		isPlacingField,
		pendingFieldType,
		placementDialogOpen,
		placementFieldTypeLabel,
		signerOptionsForPlacement,
		handleAddField,
		handleFieldPlacementRequest,
		handleFieldSelect,
		handleFieldRemove,
		handleFieldUpdate,
		handlePlacementDialogOpenChange,
		handlePlacementConfirm,
		handleBack,
		handleSend,
		handleDocumentSelect,
		handlePostSendDone,
		setPdfLayoutHeight,
		placementDocHeight,
		documentLoadingMessage,
	};
}

export type AddSignController = ReturnType<typeof useAddSignController>;
