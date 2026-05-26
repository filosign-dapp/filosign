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
			const documents = await Promise.all(
				args.documents.map(async (doc) => ({
					id: doc.id,
					name: doc.name,
					size: doc.size,
					type: doc.type,
					bytes: await loadDocumentBytes(args.localDraftId, doc),
				})),
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

			let draftId = args.draftId;
			let revision = args.revision ?? 0;
			let snapshotUploadUrl: string;
			let headSnapshotS3Key: string;

			if (!draftId) {
				const created = await createDraft.mutateAsync({
					title: args.title ?? "Untitled draft",
				});
				draftId = created.draft.id;
				revision = created.draft.revision;
				snapshotUploadUrl = created.snapshot.uploadUrl;
				headSnapshotS3Key = created.snapshot.s3Key;
			} else {
				const presigned = await rpc.drafts.presignSnapshot({ draftId });
				snapshotUploadUrl = presigned.uploadUrl;
				headSnapshotS3Key = presigned.s3Key;
			}

			if (!activeOrgId || !activeOrg?.encryptionPublicKey) {
				throw new Error("Active workspace required to save drafts");
			}

			const result = await saveDraft.mutateAsync({
				draftId,
				expectedRevision: revision,
				title: args.title,
				snapshot,
				documents,
				organizationId: activeOrgId,
				orgEncryptionPublicKey: activeOrg.encryptionPublicKey as Hex,
				snapshotUploadUrl,
				headSnapshotS3Key,
			});

			const createForm = useStorePersist.getState().createForm;
			if (createForm) {
				useStorePersist.getState().setCreateForm({
					...createForm,
					serverDraftId: draftId,
					serverDraftRevision: result.revision,
				});
			}

			return { draftId, revision: result.revision };
		},
		[activeOrg, activeOrgId, createDraft, rpc.drafts, saveDraft],
	);

	const loadDraftIntoStore = useCallback(
		async (draftId: string) => {
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
