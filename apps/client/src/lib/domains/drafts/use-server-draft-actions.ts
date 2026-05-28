import { useFilosignContext } from "@filosign/react";
import {
	useCreateDraft,
	useDecryptDraft,
	useSaveDraft,
} from "@filosign/react/drafts";
import { useActiveOrganization } from "@filosign/react/orgs";
import type { DraftSnapshot } from "@filosign/shared";
import { useCallback } from "react";
import type { Hex } from "viem";
import { buildDraftSnapshotFromForm } from "@/src/lib/domains/drafts/draft-snapshot";
import {
	buildCreateForm,
	loadDocumentBytes,
} from "@/src/lib/domains/drafts/envelope-local-draft";
import type {
	CreateForm,
	EnvelopeForm,
	SignatureField,
	StoredDocument,
} from "@/src/lib/domains/files/envelope-form-types";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { setDraftPreviewCache } from "@/src/routes/dashboard/envelope/create/-lib/utils/draft-preview-cache";

function logPersistDraft(step: string, data?: Record<string, unknown>) {
	if (!import.meta.env.DEV) return;
	if (data !== undefined) {
		console.info("[draft-save]", `persist.${step}`, data);
	} else {
		console.info("[draft-save]", `persist.${step}`);
	}
}

export function useServerDraftActions() {
	const { rpc } = useFilosignContext();
	const createDraft = useCreateDraft();
	const saveDraft = useSaveDraft();
	const decryptDraft = useDecryptDraft();
	const activeOrg = useActiveOrganization();
	const activeOrgId = useStorePersist((s) => s.activeOrgId);

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

				const documents = await Promise.all(
					args.documents.map(async (doc) => {
						try {
							const bytes = await loadDocumentBytes(args.localDraftId, doc);
							return {
								id: doc.id,
								name: doc.name,
								size: doc.size,
								type: doc.type,
								bytes,
							};
						} catch {
							throw new Error(
								`Could not read "${doc.name}" on this device. Re-add the file and save again.`,
							);
						}
					}),
				);

				const snapshot = buildDraftSnapshotFromForm({
					recipients: args.recipients,
					emailSubject: args.emailSubject,
					emailMessage: args.emailMessage,
					documents: documents.map((d) => ({
						id: d.id,
						name: d.name,
						size: d.size,
						type: d.type,
					})),
					settlementDrafts: args.settlementDrafts ?? [],
					signatureFields: args.signatureFields,
					placementManifest: args.placementManifest,
				});

				if (!activeOrgId || !activeOrg?.encryptionPublicKey) {
					throw new Error("Active workspace required to save drafts");
				}

				logPersistDraft("save_mutation.start", { draftId, revision });
				const result = await saveDraft.mutateAsync({
					draftId,
					expectedRevision: revision,
					title: args.title,
					snapshot,
					documents,
					organizationId: activeOrgId,
					orgEncryptionPublicKey: activeOrg.encryptionPublicKey as Hex,
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

	const loadDraftIntoStore = useCallback(
		async (draftId: string) => {
			logPersistDraft("load.start", { draftId });
			const head = await rpc.drafts.get({ draftId });
			const organizationId = head.draft.organizationId ?? null;
			const decrypted = await decryptDraft.mutateAsync({
				draftId,
				organizationId,
			});
			const envelopeForm: EnvelopeForm = {
				recipients: decrypted.snapshot.recipients,
				emailSubject: decrypted.snapshot.emailSubject,
				emailMessage: decrypted.snapshot.emailMessage,
				documents: decrypted.documents.map((doc) => ({
					id: doc.id,
					file: new File([Uint8Array.from(doc.bytes)], doc.name, {
						type: doc.type,
					}),
					name: doc.name,
					size: doc.bytes.byteLength,
					type: doc.type,
				})),
				settlementDrafts: decrypted.snapshot
					.settlementDrafts as EnvelopeForm["settlementDrafts"],
			};
			const createForm = await buildCreateForm(envelopeForm, null);
			createForm.signatureFields = decrypted.snapshot.signatureFields;
			createForm.serverDraftId = draftId;
			createForm.serverDraftRevision = head.draft.revision;
			setDraftPreviewCache(createForm.draftId, envelopeForm.documents);
			useStorePersist.getState().setCreateForm(createForm);
			logPersistDraft("load.ok", { draftId, revision: head.draft.revision });
			return { envelopeForm, snapshot: decrypted.snapshot };
		},
		[decryptDraft, rpc.drafts],
	);

	return {
		persistDraft,
		loadDraftIntoStore,
		isSaving: createDraft.isPending || saveDraft.isPending,
	};
}
