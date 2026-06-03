import { useFilosignContext } from "@filosign/react";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useCryptoUnlocked } from "@filosign/react/auth";
import { useEntitlements } from "@filosign/react/billing";
import { useMarkDraftSent } from "@filosign/react/drafts";
import {
	canSelectSupplementaryRecipients,
	canUseAdvancedSettlements,
	canUseConditionalAttachmentRelease,
	canUseSupplementaryAttachments,
	formatSettlementSimError,
	useSendFile,
	useSignFile,
} from "@filosign/react/files";
import { useActiveOrganization } from "@filosign/react/orgs";
import { useProfilesByAddresses, useUserProfile } from "@filosign/react/users";
import {
	normalizePlacementRecipientEmail,
	validateRegisterRoutingForSend,
} from "@filosign/shared";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Address, BaseError, type Hex } from "viem";
import {
	draftSyncModeFromSearch,
	hydrateAttachmentPacketDrafts,
	pruneSignatureFields,
	useDraftDocumentPreview,
	useServerDraftHydrate,
} from "@/src/lib/domains/drafts";
import { toAttachmentPacketDraftsForSend } from "@/src/lib/domains/files/attachment-packet-compose";
import { buildPlacementManifestV3ForEnvelope } from "@/src/lib/domains/files/build-placement-manifest";
import { buildRegisterRoutingFromForm } from "@/src/lib/domains/files/build-register-routing-from-form";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import {
	normalizeSignatureFieldsList,
	signatureFieldBoxCssPx,
} from "@/src/lib/domains/files/field-box";
import {
	validateAttachmentPacketComposeDrafts,
	validateAttachmentPacketDraftsForSend,
} from "@/src/lib/domains/files/validate-attachment-packets";
import type { ColdSharePackage } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import { buildColdInviteMagicLink } from "@/src/lib/domains/invites/cold-invite-search";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";
import {
	buildActiveAssignees,
	resolveActiveAssignee,
} from "@/src/routes/dashboard/envelope/create/add-sign/-components/active-assignee-strip";
import { useDocumentDimensions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-dimensions";
import { useAddSignFields } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-fields";
import { usePlacementHistory } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-history";
import { usePlacementMode } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-mode";
import type { Document } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { buildSettlementRulesForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/build-settlement-rules";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";
import {
	fieldsWithUnknownSignerEmails,
	resolveSelfSignerOnRoster,
	selfAssignedFieldIds,
	signerEmailsForPlacementManifest,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";
import { SELF_ASSIGNEE_ID } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";
import { resolveSettlementDraftsForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/resolve-settlement-drafts";
import {
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
	const signFile = useSignFile();
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
		margin,
		isMobile,
	} = useDocumentDimensions();
	const fieldBoxCss = signatureFieldBoxCssPx(isMobile);
	const [pdfLayoutHeight, setPdfLayoutHeight] = useState<number | null>(null);
	const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
	const pageHeightsRef = useRef<Map<number, number>>(new Map());
	const [fieldFocusRequestId, setFieldFocusRequestId] = useState<string | null>(
		null,
	);
	const placementDocHeight = pdfLayoutHeight ?? docHeight;
	const [currentDocumentId, setCurrentDocumentId] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [activeAssigneeId, setActiveAssigneeId] =
		useState<string>(SELF_ASSIGNEE_ID);
	const [isInteractingField, setIsInteractingField] = useState(false);
	const [docRendering, setDocRendering] = useState(false);
	const { data: selfProfile } = useUserProfile();
	const [sendStatus, setSendStatus] = useState<
		"idle" | "loading" | "signing" | "success" | "error"
	>("idle");
	const [postSendDialogOpen, setPostSendDialogOpen] = useState(false);
	const [postSendShare, setPostSendShare] = useState<ColdSharePackage | null>(
		null,
	);
	const isSendingRef = useRef(false);

	const suppressEmptyDraftRedirect =
		sendStatus === "loading" ||
		sendStatus === "signing" ||
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

	const { commitFields, undo, redo, canUndo, canRedo } = usePlacementHistory(
		signatureFields,
		handleSignatureFieldsChange,
	);

	const {
		placeField: placeFieldRaw,
		handleFieldUpdate: handleFieldUpdateRaw,
		handleFieldRemove: handleFieldRemoveRaw,
		handleBulkFieldUpdate,
		handleBulkFieldRemove,
		handleFieldDuplicate,
		repeatFieldOnAllPages,
		applyFieldPatches,
	} = useAddSignFields(commitFields, signatureFields);

	const {
		selectedFieldIds,
		selectedField,
		isPlacingField,
		pendingFieldType,
		setSelectedField,
		setSelectedFieldIds,
		selectField,
		clearFieldSelection,
		handleAddField,
		cancelPlacement,
		finishPlacement,
	} = usePlacementMode();

	const assignees = useMemo(
		() => buildActiveAssignees(createForm?.recipients ?? [], selfProfile),
		[createForm?.recipients, selfProfile],
	);

	useEffect(() => {
		if (assignees.length === 0) return;
		const current = assignees.find((a) => a.id === activeAssigneeId);
		if (current?.placementEnabled) return;
		const firstEnabled = assignees.find((a) => a.placementEnabled);
		if (firstEnabled) {
			setActiveAssigneeId(firstEnabled.id);
		}
	}, [assignees, activeAssigneeId]);

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

	useEffect(() => {
		if (!createForm?.signatureFields?.length) return;
		const normalized = normalizeSignatureFieldsList(
			createForm.signatureFields,
			isMobile,
		);
		const changed = normalized.some(
			(f, i) =>
				f.width !== createForm.signatureFields[i]?.width ||
				f.height !== createForm.signatureFields[i]?.height,
		);
		if (changed) {
			setCreateForm({ ...createForm, signatureFields: normalized });
		}
	}, [createForm, isMobile, setCreateForm]);

	const placeField = useCallback(
		(args: {
			type: SignatureField["type"];
			x: number;
			y: number;
			page?: number;
		}) => {
			const assignee = resolveActiveAssignee(assignees, activeAssigneeId);
			if (!assignee || !currentDocumentId) return null;
			if (!assignee.placementEnabled) {
				toast.error(
					'Turn on "I also need to sign" on the form page to place fields for yourself.',
				);
				return null;
			}
			const id = placeFieldRaw({
				type: args.type,
				x: args.x,
				y: args.y,
				documentId: currentDocumentId,
				page: args.page ?? currentPage,
				assignee,
				isMobile,
			});
			if (id && isPlacingField && pendingFieldType === args.type) {
				finishPlacement(id);
			}
			return id;
		},
		[
			assignees,
			activeAssigneeId,
			currentDocumentId,
			currentPage,
			isMobile,
			isPlacingField,
			pendingFieldType,
			placeFieldRaw,
			finishPlacement,
		],
	);

	const handleFieldUpdate = useCallback(
		(fieldId: string, updates: Partial<SignatureField>) => {
			handleFieldUpdateRaw(fieldId, updates);
		},
		[handleFieldUpdateRaw],
	);

	const handleFieldRemove = useCallback(
		(fieldId: string) => {
			handleFieldRemoveRaw(fieldId);
			setSelectedFieldIds((prev) => {
				if (!prev.has(fieldId)) return prev;
				const next = new Set(prev);
				next.delete(fieldId);
				return next;
			});
		},
		[handleFieldRemoveRaw],
	);

	const handleRemoveSelectedFields = useCallback(() => {
		if (selectedFieldIds.size === 0) return;
		handleBulkFieldRemove(selectedFieldIds);
		clearFieldSelection();
	}, [selectedFieldIds, handleBulkFieldRemove, clearFieldSelection]);

	const handleSetActiveAssigneeId = useCallback(
		(id: string) => {
			setActiveAssigneeId(id);
			if (selectedFieldIds.size === 0) return;
			const assignee = resolveActiveAssignee(assignees, id);
			if (!assignee) return;
			handleBulkFieldUpdate(selectedFieldIds, {
				assignedSignerWallet: assignee.walletAddress,
				assignedSignerName: assignee.name,
				assignedSignerEmail: assignee.email,
				required: assignee.required,
			});
		},
		[assignees, selectedFieldIds, handleBulkFieldUpdate],
	);

	const handlePlaceAtCoords = useCallback(
		(coords: { x: number; y: number; page: number }) => {
			if (!pendingFieldType || !currentDocumentId) return;
			if (assignees.length === 0) {
				cancelPlacement();
				return;
			}
			setCurrentPage(coords.page);
			const assignee = resolveActiveAssignee(assignees, activeAssigneeId);
			if (!assignee) return;
			placeField({
				type: pendingFieldType,
				x: coords.x,
				y: coords.y,
				page: coords.page,
			});
		},
		[
			pendingFieldType,
			currentDocumentId,
			assignees,
			activeAssigneeId,
			placeField,
			cancelPlacement,
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
		(fieldId: string, options?: { additive?: boolean }) => {
			cancelPlacement();
			selectField(fieldId, options?.additive ?? false);
		},
		[cancelPlacement, selectField],
	);

	const focusFieldOnCanvas = useCallback(
		(fieldId: string) => {
			const field = signatureFields.find((f) => f.id === fieldId);
			if (!field) return;
			if (field.documentId !== currentDocumentId) {
				setCurrentDocumentId(field.documentId);
			}
			if (field.page !== currentPage) {
				setCurrentPage(field.page);
			}
			handleFieldSelect(fieldId);
			setFieldFocusRequestId(fieldId);
		},
		[signatureFields, currentDocumentId, currentPage, handleFieldSelect],
	);

	const clearFieldFocusRequest = useCallback(() => {
		setFieldFocusRequestId(null);
	}, []);

	const handleRepeatFieldOnAllPages = useCallback(
		(fieldId: string) => {
			const numPages = pdfNumPages ?? 1;
			if (numPages <= 1) return;
			if (numPages > 10) {
				const ok = window.confirm(
					`Copy this field to ${numPages - 1} other pages?`,
				);
				if (!ok) return;
			}
			repeatFieldOnAllPages({
				fieldId,
				numPages,
				sourceViewport: {
					docWidth: docWidth,
					docHeight: placementDocHeight,
					margin,
				},
				pageHeightFor: (page) =>
					pageHeightsRef.current.get(page) ?? placementDocHeight,
			});
		},
		[pdfNumPages, repeatFieldOnAllPages, docWidth, placementDocHeight, margin],
	);

	const recordPdfPageLayout = useCallback((page: number, height: number) => {
		pageHeightsRef.current.set(page, height);
		setPdfLayoutHeight(height);
	}, []);

	const handleCanvasDeselect = useCallback(() => {
		clearFieldSelection();
	}, [clearFieldSelection]);

	const handleEditForm = useCallback(() => {
		navigate({ to: "/dashboard/envelope/create" });
	}, [navigate]);

	const handleBack = useCallback(() => {
		navigate({ to: "/dashboard/envelope/create" });
	}, [navigate]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				undo();
				return;
			}
			if (mod && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
				e.preventDefault();
				redo();
				return;
			}
			if (mod && e.key === "d" && selectedField) {
				e.preventDefault();
				handleFieldDuplicate(selectedField);
				return;
			}
			if (
				(e.key === "Backspace" || e.key === "Delete") &&
				selectedFieldIds.size > 0 &&
				!(e.target instanceof HTMLInputElement) &&
				!(e.target instanceof HTMLTextAreaElement)
			) {
				e.preventDefault();
				handleRemoveSelectedFields();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		undo,
		redo,
		selectedField,
		selectedFieldIds,
		handleFieldDuplicate,
		handleRemoveSelectedFields,
	]);

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
		setPdfNumPages(null);
		pageHeightsRef.current = new Map();
		setDocRendering(true);
	}, [currentDocumentId]);

	const currentDocument: Document | undefined = documents.find(
		(doc) => doc.id === currentDocumentId,
	);

	const handleSend = useCallback(async () => {
		if (isSendingRef.current) {
			return;
		}

		if (!createForm?.documents.length) {
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
		const requiredSignerRecipients = signerRecipients.filter(
			(s) => s.role === "signer",
		);
		if (requiredSignerRecipients.length === 0) {
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		const orphanFields = fieldsWithUnknownSignerEmails({
			signatureFields: createForm.signatureFields ?? [],
			signerRecipients,
		});
		if (orphanFields.length > 0) {
			const orphanEmail = normalizePlacementRecipientEmail(
				orphanFields[0]?.assignedSignerEmail ?? "",
			);
			toast.error(
				`Fields assigned to ${orphanEmail} are not on this envelope's signer list. Add yourself as a signer on the form page, or reassign those fields.`,
			);
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

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
				toast.error(
					`Add at least one field for required signer ${signerEmail}.`,
				);
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

		let attachmentComposeDrafts = createForm.attachmentPacketDrafts ?? [];
		if (attachmentComposeDrafts.length > 0) {
			try {
				attachmentComposeDrafts = await hydrateAttachmentPacketDrafts(
					createForm.draftId,
					attachmentComposeDrafts,
				);
				setCreateForm({
					...createForm,
					attachmentPacketDrafts: attachmentComposeDrafts,
				});
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Could not load supplementary files for send",
				);
				setSendStatus("error");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
		}
		if (attachmentComposeDrafts.length > 0) {
			const rosterEmails = createForm.recipients
				.map((r) => r.email?.trim())
				.filter((email): email is string =>
					Boolean(email && isValidRecipientEmail(email)),
				)
				.map((email) => normalizePlacementRecipientEmail(email));
			const attachmentIssues = [
				...validateAttachmentPacketDraftsForSend({
					supplementaryAttachments:
						canUseSupplementaryAttachments(entitlements),
					recipientSelect: canSelectSupplementaryRecipients(entitlements),
					conditionalRelease: canUseConditionalAttachmentRelease(entitlements),
					drafts: attachmentComposeDrafts,
					rosterEmails,
				}),
				...validateAttachmentPacketComposeDrafts({
					drafts: attachmentComposeDrafts,
				}),
			];
			if (attachmentIssues.length > 0) {
				toast.error(
					attachmentIssues[0]?.message ?? "Invalid supplementary files",
				);
				setSendStatus("error");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
		}

		captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeSendClicked, {
			recipient_count: createForm.recipients?.length ?? 0,
		});

		isSendingRef.current = true;
		setSendStatus("loading");

		try {
			const pageCountForDocument = (docId: string) => {
				const pages = signatureFields
					.filter((f) => f.documentId === docId)
					.map((f) => f.page);
				return Math.max(1, ...pages);
			};

			const docPayloads = await Promise.all(
				createForm.documents.map(async (doc) => {
					const bytes = await loadDocumentFileBytes(createForm.draftId, doc);
					return {
						id: doc.id,
						name: doc.name,
						mimeType: doc.type,
						bytes,
						pageCount: pageCountForDocument(doc.id),
					};
				}),
			);

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

			const placementManifest = await buildPlacementManifestV3ForEnvelope({
				documents: docPayloads,
				signerEmailsInOrder: signerEmailsForPlacementManifest({
					signerRecipients,
					signatureFields,
				}),
				signatureFields,
				docLayouts: new Map(
					createForm.documents.map((doc) => [
						doc.id,
						{
							docWidth,
							docHeight: placementDocHeight,
							fieldBox: fieldBoxCss,
						},
					]),
				),
			});

			const warmRecipientsByEmail = (createForm.recipients ?? [])
				.map((recipient) => {
					const addr = recipientResolvedSignerAddress(recipient);
					if (!addr) return null;
					const profile = recipientProfilesMapWithRecipient.get(addr)?.profile;
					if (!profile?.encryptionPublicKey || !recipient.email?.trim()) {
						return null;
					}
					return {
						email: recipient.email.trim(),
						address: addr,
						encryptionPublicKey: profile.encryptionPublicKey as Hex,
					};
				})
				.filter((x): x is NonNullable<typeof x> => x !== null);

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

			const routingValidationError = validateRegisterRoutingForSend({
				placementManifest,
				...(routing ? { routing } : {}),
			});
			if (routingValidationError) {
				toast.error(routingValidationError);
				setSendStatus("error");
				isSendingRef.current = false;
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}

			const attachmentPacketDrafts =
				attachmentComposeDrafts.length > 0
					? toAttachmentPacketDraftsForSend(
							attachmentComposeDrafts,
							createForm.recipients,
						)
					: [];

			const result = await sendFile.mutateAsync(
				{
					signers,
					viewers,
					documents: docPayloads.map(
						({ pageCount: _pageCount, ...doc }) => doc,
					),
					metadata: {
						name:
							docPayloads.length === 1
								? (docPayloads[0]?.name ?? "Document")
								: `${docPayloads[0]?.name ?? "Envelope"} (+${docPayloads.length - 1} more)`,
					},
					placementManifest,
					warmRecipientsByEmail,
					viewerEmails,
					...(coldInvitePayload ? { coldInvites: coldInvitePayload } : {}),
					...(settlementRules.length > 0 ? { settlementRules } : {}),
					...(routing ? { routing } : {}),
					...(attachmentPacketDrafts.length > 0
						? { attachmentPacketDrafts }
						: {}),
					...(activeOrg
						? {
								organizationId: activeOrg.id,
								orgEncryptionPublicKey: activeOrg.encryptionPublicKey as Hex,
							}
						: {}),
				},
				suppressGlobalErrorToast(),
			);

			const selfOnRoster = resolveSelfSignerOnRoster(
				createForm.recipients ?? [],
				selfProfile,
			);
			const selfFieldIds =
				result.success && result.pieceCid && selfOnRoster
					? selfAssignedFieldIds(signatureFields, selfOnRoster.email)
					: [];

			if (selfFieldIds.length > 0 && result.pieceCid) {
				setSendStatus("signing");
				try {
					await signFile.mutateAsync(
						{
							pieceCid: result.pieceCid,
							completedFieldIds: selfFieldIds,
						},
						suppressGlobalErrorToast(),
					);
				} catch (signErr) {
					console.error("Self-sign at send failed:", signErr);
					toast.error(
						"Document sent, but signing your fields failed. Open the document from your dashboard to finish signing.",
					);
				}
			}

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
								email: result.coldInviteShareCode.emails[0],
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
			if (error instanceof BaseError) {
				toast.error(formatSettlementSimError(error));
			} else {
				showAppErrorToast(error);
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
		signFile,
		selfProfile,
		signatureFields,
		entitlements,
		markDraftSent,
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
			clearFieldSelection();
		},
		[clearFieldSelection],
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
		signatureFields,
		setCurrentPage,
		sendStatus,
		postSendDialogOpen,
		postSendShare,
		suppressEmptyDraftRedirect,
		selectedField,
		selectedFieldIds,
		isPlacingField,
		pendingFieldType,
		placementFieldTypeLabel,
		activeAssigneeId,
		setActiveAssigneeId: handleSetActiveAssigneeId,
		assignees,
		isInteractingField,
		setIsInteractingField,
		docRendering,
		setDocRendering,
		documentWidth: docWidth,
		documentHeight: placementDocHeight,
		margin,
		pdfNumPages,
		setPdfNumPages,
		recordPdfPageLayout,
		fieldFocusRequestId,
		clearFieldFocusRequest,
		focusFieldOnCanvas,
		handleRepeatFieldOnAllPages,
		handleBulkFieldUpdate,
		applyFieldPatches,
		handleAddField,
		placeField,
		handlePlaceAtCoords,
		handleFieldSelect,
		handleCanvasDeselect,
		handleFieldRemove,
		handleFieldUpdate,
		handleFieldDuplicate,
		handleBack,
		handleEditForm,
		handleSend,
		handleDocumentSelect,
		handlePostSendDone,
		setPdfLayoutHeight,
		placementDocHeight,
		documentLoadingMessage,
		undo,
		redo,
		canUndo,
		canRedo,
		setSelectedField,
	};
}

export type AddSignController = ReturnType<typeof useAddSignController>;
