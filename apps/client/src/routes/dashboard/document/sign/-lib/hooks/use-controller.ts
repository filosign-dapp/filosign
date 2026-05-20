import { useFilosignContext } from "@filosign/react";
import {
	useAckFile,
	useComplianceBundle,
	useFileInfo,
	useRegenerateColdInvite,
	useSignDraft,
	useSignFile,
	useUpdateSignDraft,
	useViewFile,
	type ViewFileResult,
} from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import { buildRotatedInviteEnvelope } from "@filosign/react/utils";
import {
	normalizePlacementRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { defaultChain } from "@/src/constants";
import { useThirdwebUserInfo } from "@/src/lib/hooks/use-thirdweb-user-info";
import { buildColdInviteMagicLink } from "@/src/lib/routing/cold-invite-search";
import {
	buildCompliancePdfOnly,
	buildDocumentPlusCompliancePdf,
	downloadPdfBytes,
	sha256HexOfBytes,
} from "@/src/lib/utils/compliance-pdf";
import type { ColdSharePackage } from "@/src/routes/dashboard/envelope/create/add-sign/-components/cold-share-dialog";

export function useSignDocument() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid;
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	const { user } = useThirdwebUserInfo();
	const {
		data: file,
		isPending: filePending,
		error: fileError,
	} = useFileInfo({ pieceCid });
	const { data: userProfile } = useUserProfile();
	const signerAddress = user?.wallet?.address as `0x${string}` | undefined;

	const signerPlacementEmail = useMemo(() => {
		const fromProfile = userProfile?.email?.trim();
		if (fromProfile) return normalizePlacementRecipientEmail(fromProfile);
		const row = file?.signers?.find((s) => {
			if (typeof s === "string" || !signerAddress) return false;
			return s.wallet.toLowerCase() === signerAddress.toLowerCase();
		});
		if (row && typeof row === "object" && row.email?.trim()) {
			return normalizePlacementRecipientEmail(row.email);
		}
		const walletEmail = user?.email?.address?.trim();
		if (walletEmail) return normalizePlacementRecipientEmail(walletEmail);
		return null;
	}, [userProfile?.email, file?.signers, signerAddress, user?.email?.address]);

	const acknowledgeFile = useAckFile();

	const mySignature = useMemo(() => {
		if (!signerAddress || !file?.signatures?.length) return undefined;
		return file.signatures.find(
			(s) => s.signer.toLowerCase() === signerAddress.toLowerCase(),
		);
	}, [file, signerAddress]);

	const alreadySigned = Boolean(mySignature);

	const signedTxExplorerUrl = useMemo(() => {
		if (!mySignature?.onchainTxHash) return null;
		const base = defaultChain.blockExplorers?.default?.url;
		if (!base) return null;
		return `${base}/tx/${mySignature.onchainTxHash}` as const;
	}, [mySignature]);

	const explorerLabel =
		defaultChain.blockExplorers?.default?.name ?? "Block explorer";

	const isSender = Boolean(
		signerAddress &&
			file?.sender &&
			signerAddress.toLowerCase() === file.sender.toLowerCase(),
	);

	const canSign = Boolean(signerAddress && file && !alreadySigned && !isSender);

	const viewFile = useViewFile();
	const complianceBundle = useComplianceBundle();
	const signFile = useSignFile();

	const signDraftPieceCid =
		pieceCid &&
		file &&
		(Boolean(file.kemCiphertext && file.encryptedEncryptionKey) ||
			Boolean(
				file.organizationId &&
					file.orgKemCiphertext &&
					file.orgEncryptedEncryptionKey,
			))
			? pieceCid
			: undefined;
	const { data: serverDraftIds } = useSignDraft(signDraftPieceCid);
	const updateSignDraft = useUpdateSignDraft();

	const [completedFieldIds, setCompletedFieldIds] = useState<string[]>([]);
	const hasHydratedDraftForPieceCid = useRef<string | null>(null);
	const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const [coldShareDialogOpen, setColdShareDialogOpen] = useState(false);
	const [coldShare, setColdShare] = useState<ColdSharePackage | null>(null);
	const [signSuccessDialogOpen, setSignSuccessDialogOpen] = useState(false);
	const regenerateColdInvite = useRegenerateColdInvite();

	useEffect(() => {
		hasHydratedDraftForPieceCid.current = null;
		setCompletedFieldIds([]);
	}, [pieceCid]);

	useEffect(() => {
		if (!pieceCid || serverDraftIds === undefined) {
			return;
		}
		if (hasHydratedDraftForPieceCid.current === pieceCid) {
			return;
		}
		hasHydratedDraftForPieceCid.current = pieceCid;
		setCompletedFieldIds((prev) => {
			const next = prev.length > 0 ? prev : [...serverDraftIds];
			return next;
		});
	}, [pieceCid, serverDraftIds]);

	useEffect(() => {
		return () => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
		};
	}, []);

	const flushSignDraft = useCallback(
		(ids: string[]) => {
			if (!pieceCid) {
				return;
			}
			void updateSignDraft
				.mutateAsync({ pieceCid, completedFieldIds: ids })
				.catch((err: unknown) => {
					console.warn("[sign-draft] save failed", err);
				});
		},
		[pieceCid, updateSignDraft],
	);

	const scheduleSignDraftSave = useCallback(
		(ids: string[]) => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
			draftSaveTimerRef.current = setTimeout(() => {
				flushSignDraft(ids);
			}, 500);
		},
		[flushSignDraft],
	);

	const isMyPlacementFieldDone = useCallback(
		(fieldId: string) => alreadySigned || completedFieldIds.includes(fieldId),
		[alreadySigned, completedFieldIds],
	);

	const togglePlacementField = useCallback(
		(fieldId: string) => {
			if (alreadySigned) return;
			setCompletedFieldIds((prev) => {
				const isRemoving = prev.includes(fieldId);
				const next = isRemoving
					? prev.filter((x) => x !== fieldId)
					: [...prev, fieldId];
				scheduleSignDraftSave(next);
				return next;
			});
		},
		[scheduleSignDraftSave, completedFieldIds, alreadySigned],
	);

	const [zoom, setZoom] = useState(100);
	const [signPdfPage, setSignPdfPage] = useState(1);
	const [signPdfNumPages, setSignPdfNumPages] = useState<number | null>(null);
	const [viewError, setViewError] = useState<string | null>(null);
	const [fileData, setFileData] = useState<ViewFileResult | null>(null);
	const [pdfExportBusy, setPdfExportBusy] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const documentRef = useRef<HTMLDivElement>(null);

	const myPlacementFields = useMemo(() => {
		if (!signerPlacementEmail || !fileData?.placementManifest) return [];
		const parsed = zPlacementManifest.safeParse(fileData.placementManifest);
		if (!parsed.success) {
			return [];
		}
		return parsed.data.fields.filter(
			(f) => f.assignedRecipientEmail === signerPlacementEmail,
		);
	}, [fileData?.placementManifest, signerPlacementEmail]);

	const signPdfPageCountHint = useMemo(() => {
		if (myPlacementFields.length === 0) return null;
		return Math.max(...myPlacementFields.map((f) => f.pageIndex)) + 1;
	}, [myPlacementFields]);

	const requiredPlacementIds = useMemo(
		() => myPlacementFields.filter((f) => f.required).map((f) => f.id),
		[myPlacementFields],
	);

	const canSubmitPlacementSign = useMemo(() => {
		if (!canSign || myPlacementFields.length === 0) return false;
		const requiredOk =
			requiredPlacementIds.length === 0 ||
			requiredPlacementIds.every((id) => completedFieldIds.includes(id));
		const hasLeaf = completedFieldIds.length > 0;
		return requiredOk && hasLeaf;
	}, [
		canSign,
		myPlacementFields.length,
		requiredPlacementIds,
		completedFieldIds,
	]);

	const previewPdfBytes = useMemo(() => {
		if (!fileData) return null;
		const mime = fileData.metadata.mimeType;
		const name = fileData.metadata.name?.toLowerCase() ?? "";
		const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
		if (!isPdf) return null;
		// Copy once per decrypt so pdf.js Document is not remounted on unrelated re-renders.
		return fileData.fileBytes.slice();
	}, [fileData]);

	const isSigningPdf = Boolean(previewPdfBytes);
	const signPdfTotalDisplay = signPdfNumPages ?? signPdfPageCountHint;

	useEffect(() => {
		setSignPdfPage(1);
		setSignPdfNumPages(null);
	}, [pieceCid, previewPdfBytes]);

	const handleViewFile = useCallback(async () => {
		if (!file) return;

		const hasParticipantWrap =
			Boolean(file.kemCiphertext) && Boolean(file.encryptedEncryptionKey);
		const hasOrgVaultWrap =
			Boolean(file.organizationId) &&
			Boolean(file.orgKemCiphertext) &&
			Boolean(file.orgEncryptedEncryptionKey);

		if (!(hasParticipantWrap || hasOrgVaultWrap)) {
			setViewError(
				"Missing decryption keys. Acknowledge the file first, or ask an admin for your organization key.",
			);
			return;
		}

		try {
			setViewError(null);

			let result: ViewFileResult;

			const kemCiphertext = file.kemCiphertext;
			const encryptedEncryptionKey = file.encryptedEncryptionKey;
			const organizationId = file.organizationId;
			const orgKemCiphertext = file.orgKemCiphertext;
			const orgEncryptedEncryptionKey = file.orgEncryptedEncryptionKey;
			const status = file.status as "s3" | "foc";

			if (hasParticipantWrap) {
				if (!kemCiphertext || !encryptedEncryptionKey) {
					setViewError(
						"Missing decryption keys. Acknowledge the file first, or ask an admin for your organization key.",
					);
					return;
				}
				result = await viewFile.mutateAsync({
					pieceCid: file.pieceCid,
					kemCiphertext,
					encryptedEncryptionKey,
					status,
				});
			} else if (
				organizationId &&
				orgKemCiphertext &&
				orgEncryptedEncryptionKey
			) {
				result = await viewFile.mutateAsync({
					variant: "org",
					pieceCid: file.pieceCid,
					organizationId,
					orgKemCiphertext,
					orgEncryptedEncryptionKey,
					status,
				});
			} else {
				setViewError(
					"Missing decryption keys. Acknowledge the file first, or ask an admin for your organization key.",
				);
				return;
			}
			setFileData(result);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to load file for signing";
			console.error("Failed to load file:", error);
			setViewError(errorMessage);
			toast.error(errorMessage);
		}
	}, [file, viewFile]);

	useEffect(() => {
		const participant =
			!!file && Boolean(file.kemCiphertext && file.encryptedEncryptionKey);
		const orgVault = Boolean(
			file?.organizationId &&
				file?.orgKemCiphertext &&
				file?.orgEncryptedEncryptionKey,
		);

		if ((participant || orgVault) && !fileData && !viewFile.isPending) {
			void handleViewFile();
		}
	}, [file, fileData, viewFile.isPending, handleViewFile]);

	const handleZoomIn = useCallback(() => {
		setZoom((prev) => Math.min(prev + 25, 200));
	}, []);

	const handleZoomOut = useCallback(() => {
		setZoom((prev) => Math.max(prev - 25, 50));
	}, []);

	const handleDownload = useCallback(() => {
		if (fileData) {
			const arrayBuffer = new ArrayBuffer(fileData.fileBytes.length);
			new Uint8Array(arrayBuffer).set(fileData.fileBytes);
			const blob = new Blob([arrayBuffer], {
				type: fileData.metadata.mimeType,
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download =
				fileData.metadata.name ||
				`document-${(pieceCid ?? "unknown").slice(0, 8)}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("File downloaded!");
		}
	}, [fileData, pieceCid]);

	const handleDownloadCompliancePdf = useCallback(async () => {
		if (!file || !pieceCid) return;
		setPdfExportBusy(true);
		try {
			const documentSha256 = fileData
				? await sha256HexOfBytes(fileData.fileBytes)
				: undefined;
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid,
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const bytes = await buildCompliancePdfOnly({
				bundle,
				bundleHash,
				exportId,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				documentSha256,
				decryptedDocumentMeta: fileData
					? {
							name: fileData.metadata.name,
							mimeType: fileData.metadata.mimeType,
							sizeBytes: fileData.fileBytes.length,
						}
					: null,
			});
			const safe = pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-file-record-${safe}`);
			toast.success("Compliance PDF downloaded");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not create compliance PDF",
			);
		} finally {
			setPdfExportBusy(false);
		}
	}, [complianceBundle, file, fileData, pieceCid]);

	const handleDownloadDocumentWithCompliancePdf = useCallback(async () => {
		if (!file || !pieceCid || !fileData) {
			toast.error("Load the document first to bundle with the compliance PDF.");
			return;
		}
		setPdfExportBusy(true);
		try {
			const documentSha256 = await sha256HexOfBytes(fileData.fileBytes);
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid,
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const bytes = await buildDocumentPlusCompliancePdf({
				bundle,
				bundleHash,
				exportId,
				fileData,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				documentSha256,
			});
			const safe = pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-document-with-record-${safe}`);
			toast.success("PDF with document and compliance appendix downloaded");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not create bundled PDF",
			);
		} finally {
			setPdfExportBusy(false);
		}
	}, [complianceBundle, file, fileData, pieceCid]);

	const formatAddress = useCallback((address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}, []);

	const handleAcknowledge = useCallback(async () => {
		if (!pieceCid) return;

		try {
			await acknowledgeFile.mutateAsync({ pieceCid });
			toast.success("File acknowledged!");
		} catch (error) {
			console.error(error);
			toast.error("Failed to acknowledge file");
		}
	}, [pieceCid, acknowledgeFile]);

	const handleSign = useCallback(async () => {
		if (!pieceCid) {
			return;
		}
		if (!canSubmitPlacementSign) {
			const errMsg = "Mark every required field on the document first.";
			toast.error(errMsg);
			return;
		}
		try {
			await signFile.mutateAsync({
				pieceCid,
				completedFieldIds,
			});
			if (pieceCid) {
				await queryClient.invalidateQueries({
					queryKey: rpcQuery.files.piece.detail.key({
						input: { pieceCid },
					}),
				});
			}
			setSignSuccessDialogOpen(true);
			toast.success("Document signed successfully!");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to sign";
			console.error(error);
			toast.error(errorMessage);
		}
	}, [
		pieceCid,
		canSubmitPlacementSign,
		completedFieldIds,
		signFile,
		queryClient,
		rpcQuery.files.piece.detail,
	]);

	const handleRotateInvite = useCallback(async () => {
		if (!pieceCid || !file || !user?.wallet?.address) return;
		const confirmed = window.confirm(
			"Rotate invite now? Existing magic links and codes will stop working.",
		);
		if (!confirmed) return;

		try {
			const { phrase, inviteToken, wrappedEncryptionKey } =
				await buildRotatedInviteEnvelope({
					pieceCid,
					walletAddress: user.wallet.address as `0x${string}`,
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
			});
			setColdShare({
				emails: result.recipientEmails,
				phrase,
				magicLink,
			});
			setColdShareDialogOpen(true);
			toast.success("Invite rotated. Old links are now invalid.");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to rotate invite",
			);
		}
	}, [pieceCid, file, user, regenerateColdInvite]);

	return {
		navigation: { navigate, pieceCid },
		fileQuery: {
			file,
			filePending,
			fileError,
			acknowledgeFile,
		},
		signSuccess: {
			signSuccessDialogOpen,
			setSignSuccessDialogOpen,
		},
		identity: { user, userProfile, signerAddress },
		placement: {
			completedFieldIds,
			myPlacementFields,
			togglePlacementField,
			isMyPlacementFieldDone,
			canSubmitPlacementSign,
			signerPlacementEmail,
		},
		viewer: {
			fileData,
			viewError,
			viewFile,
			handleViewFile,
			zoom,
			handleZoomIn,
			handleZoomOut,
			previewPdfBytes,
			signPdfPage,
			setSignPdfPage,
			signPdfNumPages,
			setSignPdfNumPages,
			signPdfTotalDisplay,
			isSigningPdf,
		},
		signing: {
			canSign,
			alreadySigned,
			signFile,
			handleSign,
			mySignature,
		},
		meta: {
			isSender,
			signedTxExplorerUrl,
			explorerLabel,
			formatAddress,
		},
		compliance: {
			pdfExportBusy,
			handleDownload,
			handleDownloadCompliancePdf,
			handleDownloadDocumentWithCompliancePdf,
		},
		coldShare: {
			coldShareDialogOpen,
			setColdShareDialogOpen,
			coldShare,
			setColdShare,
			handleRotateInvite,
			regenerateColdInvite,
		},
		refs: { containerRef, documentRef },
		acknowledge: { handleAcknowledge },
	};
}

export type SignDocumentController = ReturnType<typeof useSignDocument>;
