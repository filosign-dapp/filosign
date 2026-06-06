import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerDraftActions } from "@/src/lib/domains/drafts/server";
import {
	clearPersistedCreateFormFromDisk,
	type DraftSyncMode,
	digestCreateFormSnapshot,
	draftSyncModeFromSearch,
	isCreateFormDirty,
} from "@/src/lib/domains/drafts/utils/draft-form-state";
import { buildPlacementManifestForDocument } from "@/src/lib/domains/files/build-placement-manifest";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { defaultPlacementFieldRect } from "@/src/lib/domains/files/field-box";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { safeAsync } from "@/src/lib/utils/safe";

const SAVED_FLASH_MS = 3000;

export function placementManifestFromCreateForm(form: CreateForm) {
	const doc = form.documents[0];
	if (!doc) return null;
	return buildPlacementManifestForDocument({
		docId: doc.id,
		signerEmailsInOrder: form.recipients
			.filter((r) => r.role === "signer")
			.map((r) => normalizePlacementRecipientEmail(r.email.trim())),
		signatureFields: form.signatureFields ?? [],
		docWidth: 612,
		docHeight: 792,
		fieldBox: defaultPlacementFieldRect("signature", false),
		strict: false,
	});
}

export function useDraftSaveUi(args: {
	urlServerDraftId: string | undefined;
	createForm: CreateForm | null;
	cryptoReady: boolean;
	cryptoNeedsRecovery: boolean;
}) {
	const navigate = useNavigate();
	const { urlServerDraftId, createForm, cryptoReady, cryptoNeedsRecovery } =
		args;
	const draftSyncMode: DraftSyncMode =
		draftSyncModeFromSearch(urlServerDraftId);
	const { persistDraft, isSaving } = useServerDraftActions();

	const serverDraftId = urlServerDraftId ?? createForm?.serverDraftId;

	const [baselineDigest, setBaselineDigest] = useState("");
	const [showSavedFlash, setShowSavedFlash] = useState(false);
	const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const placementManifest = useMemo(
		() => (createForm ? placementManifestFromCreateForm(createForm) : null),
		[createForm],
	);

	const currentDigest = useMemo(() => {
		if (!createForm || !placementManifest) return "";
		return digestCreateFormSnapshot(createForm, placementManifest);
	}, [createForm, placementManifest]);

	useEffect(() => {
		if (createForm?.lastSavedSnapshotDigest) {
			setBaselineDigest(createForm.lastSavedSnapshotDigest);
		} else {
			setBaselineDigest("");
		}
	}, [
		createForm?.serverDraftId,
		createForm?.serverDraftRevision,
		createForm?.lastSavedSnapshotDigest,
	]);

	useEffect(() => {
		return () => {
			if (savedFlashTimerRef.current) {
				clearTimeout(savedFlashTimerRef.current);
			}
		};
	}, []);

	const hasChanges = isCreateFormDirty(currentDigest, baselineDigest);

	const isSavedToServer = Boolean(
		serverDraftId && baselineDigest && !hasChanges,
	);

	const showSavedState = showSavedFlash || (isSavedToServer && !isSaving);

	const savedLabel =
		draftSyncMode === "server" &&
		createForm?.serverDraftRevision != null &&
		`Saved`;

	useEffect(() => {
		if (draftSyncMode !== "server" || !hasChanges) return;
		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [draftSyncMode, hasChanges]);

	const handleSaveDraft = useCallback(() => {
		if (!createForm || !placementManifest) return;
		const doc = createForm.documents[0];
		if (!doc) {
			toast.error("Upload a document first");
			return;
		}
		if (!cryptoReady) {
			toast.error(
				cryptoNeedsRecovery
					? "Unlock encryption keys with your recovery phrase before saving."
					: "Unlocking encryption keys. Try saving again in a moment.",
			);
			return;
		}
		if (import.meta.env.DEV) {
			console.info("[draft-save]", "ui.click", {
				serverDraftId: createForm.serverDraftId,
				revision: createForm.serverDraftRevision,
				hasChanges,
				draftSyncMode,
			});
		}
		void safeAsync(() =>
			persistDraft({
				draftId: createForm.serverDraftId,
				revision: createForm.serverDraftRevision ?? 0,
				title: createForm.emailSubject || "Untitled draft",
				localDraftId: createForm.draftId,
				recipients: createForm.recipients,
				emailSubject: createForm.emailSubject,
				emailMessage: createForm.emailMessage,
				documents: createForm.documents,
				settlementDrafts: createForm.settlementDrafts ?? [],
				signatureFields: createForm.signatureFields ?? [],
				placementManifest,
			}),
		).then(([, err]) => {
			if (err) {
				toast.error(
					err.message.length > 0 ? err.message : "Failed to save draft",
				);
				return;
			}
			const saved = useStorePersist.getState().createForm;
			const savedDraftId = saved?.serverDraftId;
			if (!savedDraftId) return;

			if (!urlServerDraftId?.trim()) {
				clearPersistedCreateFormFromDisk();
				void navigate({
					to: "/dashboard/envelope/create/add-sign",
					search: { serverDraftId: savedDraftId },
					replace: true,
				});
			}

			setBaselineDigest(saved?.lastSavedSnapshotDigest ?? currentDigest);
			setShowSavedFlash(true);
			if (savedFlashTimerRef.current) {
				clearTimeout(savedFlashTimerRef.current);
			}
			savedFlashTimerRef.current = setTimeout(() => {
				setShowSavedFlash(false);
				savedFlashTimerRef.current = null;
			}, SAVED_FLASH_MS);
		});
	}, [
		createForm,
		placementManifest,
		cryptoReady,
		cryptoNeedsRecovery,
		persistDraft,
		hasChanges,
		draftSyncMode,
		urlServerDraftId,
		navigate,
		currentDigest,
	]);

	return {
		serverDraftId,
		draftSyncMode,
		isSaving,
		hasChanges,
		isSavedToServer,
		showSavedState,
		savedLabel,
		handleSaveDraft,
		placementManifest,
	};
}
