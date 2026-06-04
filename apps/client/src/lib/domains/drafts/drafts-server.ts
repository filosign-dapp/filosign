import { useFilosignContext } from "@filosign/react";
import {
	clearAllDraftDekCache,
	useCreateDraft,
	useDecryptDraft,
	useSaveDraft,
} from "@filosign/react/drafts";
import { useActiveOrganization } from "@filosign/react/orgs";
import { type DraftSnapshot, digestDraftSnapshot } from "@filosign/shared";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	buildCreateForm,
	loadDocumentBytes,
	loadDraftDocuments,
} from "@/src/lib/domains/drafts/envelope-local-draft";
import {
	buildDraftSnapshotFromForm,
	clearPersistedCreateFormFromDisk,
	type DraftSyncMode,
} from "@/src/lib/domains/drafts/utils/draft-form-state";
import {
	setHydratedDraftPreviewPdfBytes,
	takeHydratedDraftPreviewPdfBytes,
} from "@/src/lib/domains/drafts/utils/draft-hydrate-preview";
import { isPdfDocument } from "@/src/lib/domains/files/document-kind";
import type {
	CreateForm,
	EnvelopeForm,
	SignatureField,
	StoredDocument,
} from "@/src/lib/domains/files/envelope-form-types";
import { normalizeSignatureFieldsList } from "@/src/lib/domains/files/field-box";
import { useStorePersist } from "@/src/lib/filosign/use-store";

const LOG_PREFIX = "[draft-save]";

const hydrateInFlight = new Map<string, Promise<void>>();

function logPersistDraft(step: string, data?: Record<string, unknown>): void {
	if (!import.meta.env.DEV) return;
	if (data !== undefined) {
		console.info(LOG_PREFIX, `persist.${step}`, data);
	} else {
		console.info(LOG_PREFIX, `persist.${step}`);
	}
}

function pdfBytesFromDecryptedDocuments(
	documents: { id: string; name: string; type: string; bytes: Uint8Array }[],
): Record<string, Uint8Array> {
	const pdfBytes: Record<string, Uint8Array> = {};
	for (const doc of documents) {
		if (isPdfDocument({ type: doc.type, name: doc.name })) {
			pdfBytes[doc.id] = doc.bytes;
		}
	}
	return pdfBytes;
}

type DecryptedDraftLoad = {
	snapshot: DraftSnapshot;
	documents: { id: string; name: string; type: string; bytes: Uint8Array }[];
};

export async function applyServerDraftToCreateForm(args: {
	draftId: string;
	revision: number;
	decrypted: DecryptedDraftLoad;
	prevCreateForm?: CreateForm | null;
}): Promise<CreateForm> {
	const envelopeForm: EnvelopeForm = {
		recipients: args.decrypted.snapshot.recipients,
		emailSubject: args.decrypted.snapshot.emailSubject,
		emailMessage: args.decrypted.snapshot.emailMessage,
		documents: args.decrypted.documents.map((doc) => ({
			id: doc.id,
			file: new File([Uint8Array.from(doc.bytes)], doc.name, {
				type: doc.type,
			}),
			name: doc.name,
			size: doc.bytes.byteLength,
			type: doc.type,
		})),
		settlementDrafts: args.decrypted.snapshot
			.settlementDrafts as EnvelopeForm["settlementDrafts"],
	};
	const createForm = await buildCreateForm(
		envelopeForm,
		args.prevCreateForm ?? null,
	);
	createForm.signatureFields = normalizeSignatureFieldsList(
		args.decrypted.snapshot.signatureFields as SignatureField[],
	);
	createForm.serverDraftId = args.draftId;
	createForm.serverDraftRevision = args.revision;
	createForm.lastSavedSnapshotDigest = digestDraftSnapshot(
		args.decrypted.snapshot,
	);
	return createForm;
}

export function useServerDraftActions() {
	const { rpc } = useFilosignContext();
	const createDraft = useCreateDraft();
	const saveDraft = useSaveDraft();
	const decryptDraft = useDecryptDraft();
	const activeOrg = useActiveOrganization();
	const activeOrgId = useStorePersist((s) => s.activeOrgId);
	const prevOrgIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (prevOrgIdRef.current != null && prevOrgIdRef.current !== activeOrgId) {
			clearAllDraftDekCache();
		}
		prevOrgIdRef.current = activeOrgId ?? null;
	}, [activeOrgId]);

	const persistDraft = useCallback(
		async (args: {
			draftId?: string;
			revision?: number;
			title?: string;
			localDraftId: string;
			recipients: CreateForm["recipients"];
			emailSubject: string;
			emailMessage: string;
			documents: StoredDocument[];
			settlementDrafts: CreateForm["settlementDrafts"];
			signatureFields: SignatureField[];
			placementManifest: DraftSnapshot["placementManifest"];
		}) => {
			logPersistDraft("start", {
				serverDraftId: args.draftId,
				revision: args.revision,
				documentCount: args.documents.length,
				fieldCount: args.signatureFields.length,
			});

			try {
				let draftId = args.draftId;
				let revision = args.revision ?? 0;

				if (!draftId) {
					logPersistDraft("create_rpc.start");
					const created = await createDraft.mutateAsync({
						title: args.title ?? "Untitled draft",
					});
					draftId = created.draft.id;
					revision = created.draft.revision;
					logPersistDraft("create_rpc.ok", { draftId, revision });
				}

				const snapshot = buildDraftSnapshotFromForm({
					recipients: args.recipients,
					emailSubject: args.emailSubject,
					emailMessage: args.emailMessage,
					documents: args.documents.map((d) => ({
						id: d.id,
						name: d.name,
						size: d.size,
						type: d.type,
					})),
					settlementDrafts: args.settlementDrafts ?? [],
					signatureFields: args.signatureFields,
					placementManifest: args.placementManifest,
				});
				const snapshotDigest = digestDraftSnapshot(snapshot);

				if (!activeOrgId || !activeOrg?.encryptionPublicKey) {
					throw new Error("Active workspace required to save drafts");
				}

				logPersistDraft("save_mutation.start", { draftId, revision });
				const docById = new Map(args.documents.map((d) => [d.id, d]));
				const result = await saveDraft.mutateAsync({
					draftId,
					expectedRevision: revision,
					title: args.title,
					snapshot,
					snapshotDigest,
					documents: args.documents.map((d) => ({
						id: d.id,
						name: d.name,
						size: d.size,
						type: d.type,
					})),
					loadDocumentBytes: async (docId) => {
						const doc = docById.get(docId);
						if (!doc) {
							throw new Error(
								`Could not read document ${docId} on this device. Re-add the file and save again.`,
							);
						}
						try {
							return await loadDocumentBytes(args.localDraftId, doc);
						} catch {
							throw new Error(
								`Could not read "${doc.name}" on this device. Re-add the file and save again.`,
							);
						}
					},
					organizationId: activeOrgId,
					orgEncryptionPublicKey: activeOrg.encryptionPublicKey,
				});
				logPersistDraft("save_mutation.ok", {
					draftId,
					revision: result.revision,
				});

				const latestCreateForm = useStorePersist.getState().createForm;
				if (latestCreateForm) {
					useStorePersist.getState().setCreateForm({
						...latestCreateForm,
						serverDraftId: draftId,
						serverDraftRevision: result.revision,
						lastSavedSnapshotDigest: snapshotDigest,
					});
				}

				return { draftId, revision: result.revision };
			} catch (error) {
				logPersistDraft("failed", {
					message: error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		},
		[activeOrg, activeOrgId, createDraft, saveDraft],
	);

	const decryptDraftAsync = decryptDraft.mutateAsync;

	const loadDraftIntoStore = useCallback(
		async (draftId: string) => {
			logPersistDraft("load.start", { draftId });
			const head = await rpc.drafts.get({ draftId });
			const decrypted = await decryptDraftAsync({
				draftId,
				head,
			});
			const prevCreateForm = useStorePersist.getState().createForm;
			const createForm = await applyServerDraftToCreateForm({
				draftId,
				revision: head.draft.revision,
				decrypted,
				prevCreateForm,
			});
			setHydratedDraftPreviewPdfBytes(
				createForm.draftId,
				pdfBytesFromDecryptedDocuments(decrypted.documents),
			);
			useStorePersist.getState().setCreateForm(createForm);
			logPersistDraft("load.ok", { draftId, revision: head.draft.revision });
			return { snapshot: decrypted.snapshot };
		},
		[decryptDraftAsync, rpc.drafts],
	);

	return {
		persistDraft,
		loadDraftIntoStore,
		isSaving: createDraft.isPending || saveDraft.isPending,
	};
}

export type ServerDraftLoadState =
	| "idle"
	| "awaiting_crypto"
	| "loading"
	| "error";

function runHydrateInFlight(
	draftId: string,
	run: () => Promise<unknown>,
): Promise<void> {
	const existing = hydrateInFlight.get(draftId);
	if (existing) return existing;

	const promise = run()
		.then(() => undefined)
		.finally(() => {
			if (hydrateInFlight.get(draftId) === promise) {
				hydrateInFlight.delete(draftId);
			}
		});
	hydrateInFlight.set(draftId, promise);
	return promise;
}

export function useServerDraftHydrate(args: {
	pendingServerDraftId: string | undefined;
	cryptoReady: boolean;
}) {
	const { pendingServerDraftId, cryptoReady } = args;
	const navigate = useNavigate();
	const { loadDraftIntoStore } = useServerDraftActions();
	const loadDraftIntoStoreRef = useRef(loadDraftIntoStore);
	loadDraftIntoStoreRef.current = loadDraftIntoStore;
	const [serverDraftLoadState, setServerDraftLoadState] =
		useState<ServerDraftLoadState>("idle");
	const lastServerHydrateRef = useRef<string | null>(null);
	const prevPendingServerDraftIdRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		const targetId = pendingServerDraftId?.trim();
		if (targetId !== prevPendingServerDraftIdRef.current) {
			lastServerHydrateRef.current = null;
			prevPendingServerDraftIdRef.current = targetId;
		}
	}, [pendingServerDraftId]);

	useEffect(() => {
		const targetId = pendingServerDraftId?.trim();
		if (!targetId) {
			setServerDraftLoadState("idle");
			return;
		}

		const hydrateKey = targetId;
		if (lastServerHydrateRef.current === hydrateKey) {
			setServerDraftLoadState("idle");
			return;
		}

		const existing = useStorePersist.getState().createForm;
		if (existing?.serverDraftId === targetId && existing.documents.length > 0) {
			lastServerHydrateRef.current = hydrateKey;
			setServerDraftLoadState("idle");
			clearPersistedCreateFormFromDisk();
			return;
		}

		if (!cryptoReady) {
			setServerDraftLoadState("awaiting_crypto");
			return;
		}

		let cancelled = false;
		setServerDraftLoadState("loading");
		clearPersistedCreateFormFromDisk();

		void runHydrateInFlight(targetId, () =>
			loadDraftIntoStoreRef.current(targetId),
		)
			.then(() => {
				if (cancelled) return;
				lastServerHydrateRef.current = hydrateKey;
				setServerDraftLoadState("idle");
			})
			.catch((err) => {
				if (cancelled) return;
				lastServerHydrateRef.current = null;
				setServerDraftLoadState("error");
				toast.error(
					err instanceof Error && err.message.length > 0
						? err.message
						: "Failed to open draft",
				);
				void navigate({ to: "/dashboard/drafts", replace: true });
			});

		return () => {
			cancelled = true;
		};
	}, [pendingServerDraftId, cryptoReady, navigate]);

	const documentLoadingMessage = useMemo((): string | null => {
		if (!pendingServerDraftId?.trim()) return null;
		if (serverDraftLoadState === "awaiting_crypto") {
			return "Unlocking encryption keys…";
		}
		if (serverDraftLoadState === "loading") {
			return "Loading draft…";
		}
		return null;
	}, [pendingServerDraftId, serverDraftLoadState]);

	return { serverDraftLoadState, documentLoadingMessage };
}

export function useDraftDocumentPreview(args: {
	createForm: CreateForm | null;
	draftSyncMode: DraftSyncMode;
	serverDraftLoadState: ServerDraftLoadState;
}) {
	const { createForm, draftSyncMode, serverDraftLoadState } = args;
	const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
	const [documentPdfBytes, setDocumentPdfBytes] = useState<
		Record<string, Uint8Array>
	>({});

	const draftDocumentKey = useMemo(
		() =>
			(createForm?.documents ?? [])
				.map((d) => `${d.id}:${d.size}:${d.type}`)
				.join("|"),
		[createForm?.documents],
	);

	const previewBlocked =
		draftSyncMode === "server" &&
		(serverDraftLoadState === "loading" ||
			serverDraftLoadState === "awaiting_crypto");

	useEffect(() => {
		if (!createForm?.draftId || !draftDocumentKey) {
			setDocumentUrls({});
			setDocumentPdfBytes({});
			return;
		}
		if (previewBlocked) {
			return;
		}

		let cancelled = false;
		void (async () => {
			const hydratedPdf = takeHydratedDraftPreviewPdfBytes(createForm.draftId);
			if (hydratedPdf && Object.keys(hydratedPdf).length > 0) {
				if (cancelled) return;
				setDocumentUrls({});
				setDocumentPdfBytes(hydratedPdf);
				return;
			}

			const docs = await loadDraftDocuments(
				createForm.draftId,
				createForm.documents,
			);
			if (!docs.length) return;
			if (cancelled) return;

			const urls: Record<string, string> = {};
			const pdfBytes: Record<string, Uint8Array> = {};
			for (const doc of docs) {
				if (isPdfDocument({ type: doc.type, name: doc.name })) {
					const buffer = await doc.file.arrayBuffer();
					pdfBytes[doc.id] = new Uint8Array(buffer);
				} else {
					urls[doc.id] = URL.createObjectURL(doc.file);
				}
			}
			if (cancelled) return;
			setDocumentUrls(urls);
			setDocumentPdfBytes(pdfBytes);
		})().catch((error) =>
			console.error("Failed to load draft preview:", error),
		);

		return () => {
			cancelled = true;
			setDocumentUrls((prev) => {
				for (const url of Object.values(prev)) URL.revokeObjectURL(url);
				return {};
			});
			setDocumentPdfBytes({});
		};
	}, [
		createForm?.draftId,
		createForm?.documents,
		draftDocumentKey,
		previewBlocked,
	]);

	return { documentUrls, documentPdfBytes, draftDocumentKey };
}
