import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useSendFile } from "@filosign/react/files";
import { useActiveOrganization } from "@filosign/react/orgs";
import { useProfilesByAddresses } from "@filosign/react/users";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Address, Hex } from "viem";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { buildColdInviteMagicLink } from "@/src/lib/routing/cold-invite-search";
import { constrainFieldTopLeft } from "@/src/lib/utils/placement-viewport";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import type { ColdSharePackage } from "@/src/routes/dashboard/envelope/create/add-sign/-components/cold-share-dialog";
import type {
	FieldPlacementConfirmPayload,
	FieldPlacementSignerOption,
} from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-dialog";
import { useDocumentDimensions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-dimensions";
import { useSignatureFields } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-fields";
import type { Document } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { signatureFieldBoxCssPx } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-box";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";
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

export function useAddSignController() {
	const navigate = useNavigate();
	const { createForm, clearCreateForm } = useStorePersist();
	const captureAppEvent = useCaptureAppEvent();
	const sendFile = useSendFile();
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
	const [coldShareDialogOpen, setColdShareDialogOpen] = useState(false);
	const [coldShare, setColdShare] = useState<ColdSharePackage | null>(null);
	const isSendingRef = useRef(false);

	const {
		signatureFields,
		selectedField,
		isPlacingField,
		pendingFieldType,
		setSelectedField,
		handleAddField,
		handleFieldPlaced: placeField,
		handleFieldRemove,
		handleFieldUpdate,
		cancelPlacement,
	} = useSignatureFields();

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

	const documents: Document[] = (createForm?.documents ?? []).map((doc) => ({
		id: doc.id,
		name: doc.name,
		url: doc.dataUrl || "",
		pages: 1,
	}));

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
				toast.error(
					"Add at least one signer with an email address before placing fields.",
				);
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
			toast.info("Already sending...");
			return;
		}

		if (!createForm?.documents.length) {
			toast.error("Add a document first");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		if (createForm.documents.length !== 1) {
			toast.error("Only one document supported");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		if (!createForm.recipients || createForm.recipients.length === 0) {
			toast.error("Add recipients first");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		const signerRecipients = createForm.recipients.filter(
			(r) => r.role === "signer",
		);
		if (signerRecipients.length === 0) {
			toast.error("Add at least one signer");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		const unresolvedSignerEmails = signerRecipients.filter(
			(r) => !r.email?.trim(),
		);
		if (unresolvedSignerEmails.length > 0) {
			toast.error("Every signer must have an email address.");
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
				toast.error(`${signer.name || "A signer"} has no signature fields`);
				setSendStatus("error");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
			if (!signerFields.some((f) => f.required)) {
				toast.error(
					`${signer.name || "A signer"} needs at least one required field`,
				);
				setSendStatus("error");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
		}

		if (recipientProfilesLoading) {
			toast.error("Loading recipient info...");
			return;
		}

		const missingProfiles = createForm.recipients.filter((r) => {
			const addr = recipientResolvedSignerAddress(r);
			if (!addr) return false;
			return !recipientProfilesMapWithRecipient.has(addr);
		});
		if (missingProfiles.length > 0) {
			toast.error("Loading recipient profiles...");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeSendClicked, {
			recipient_count: createForm.recipients?.length ?? 0,
		});

		isSendingRef.current = true;
		setSendStatus("loading");
		toast.loading("Sending documents...", { id: "send-progress" });

		try {
			const doc = createForm.documents[0];
			if (!doc) {
				throw new Error("No document to send");
			}
			const fileData = await loadDocumentFileBytes(doc);

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

			const result = await sendFile.mutateAsync({
				signers,
				viewers,
				bytes: fileData,
				metadata: { name: doc.name },
				placementManifest,
				viewerEmails,
				...(coldInvitePayload ? { coldInvites: coldInvitePayload } : {}),
				...(activeOrg
					? {
							organizationId: activeOrg.id,
							orgEncryptionPublicKey: activeOrg.encryptionPublicKey as Hex,
						}
					: {}),
			});

			clearCreateForm();

			setSendStatus("success");
			toast.success("Documents sent successfully!", {
				id: "send-progress",
			});

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
					: undefined;

			if (shareCode) {
				setColdShare(shareCode);
				setColdShareDialogOpen(true);
			} else {
				setTimeout(() => {
					navigate({ to: "/dashboard" });
				}, 1500);
			}
		} catch (error) {
			setSendStatus("error");
			if (
				error instanceof Error &&
				error.message === SendEnvelopeError.MISSING_DATA_URL
			) {
				toast.dismiss("send-progress");
				toast.error("Document is missing file data");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
			console.error("Failed to send documents:", error);
			toast.error("Failed to send documents. Please try again.", {
				id: "send-progress",
			});
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

	const handleColdShareDone = useCallback(() => {
		setColdShareDialogOpen(false);
		setColdShare(null);
		navigate({ to: "/dashboard" });
	}, [navigate]);

	return {
		documents,
		currentDocument,
		currentDocumentId,
		currentPage,
		currentPageFields,
		zoom,
		setZoom,
		setCurrentPage,
		sendStatus,
		coldShareDialogOpen,
		coldShare,
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
		handleColdShareDone,
		setPdfLayoutHeight,
		placementDocHeight,
	};
}

export type AddSignController = ReturnType<typeof useAddSignController>;
