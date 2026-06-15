import {
	useCreateOrgTemplate,
	usePrepareOrgTemplateCreate,
	usePrepareOrgTemplateUpdate,
	useUpdateOrgTemplate,
} from "@filosign/react/orgs";
import { uploadOrgTemplateDocuments } from "@filosign/react/utils";
import { useCallback, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { loadDocumentBytes } from "@/src/lib/domains/drafts";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { buildTemplateSnapshotFromComposer } from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast } from "@/src/lib/errors";

type SaveTemplateArgs = {
	createForm: CreateForm;
	templateId: string;
	templateName: string;
	organizationId: string;
	orgEncryptionPublicKey: `0x${string}`;
	mode: "create" | "edit";
};

export function useTemplateEditorSave() {
	const prepareCreate = usePrepareOrgTemplateCreate();
	const prepareUpdate = usePrepareOrgTemplateUpdate();
	const createTemplate = useCreateOrgTemplate();
	const updateTemplate = useUpdateOrgTemplate();
	const [saving, setSaving] = useState(false);

	const saveTemplate = useCallback(
		async (args: SaveTemplateArgs) => {
			setSaving(true);
			try {
				const documentRows = await Promise.all(
					args.createForm.documents.map(async (doc) => ({
						docId: doc.id,
						name: doc.name,
						size: doc.size,
						mimeType: doc.type,
						bytes: await loadDocumentBytes(args.createForm.draftId, {
							id: doc.id,
							name: doc.name,
							size: doc.size,
							type: doc.type,
						}),
					})),
				);

				const snapshot = buildTemplateSnapshotFromComposer({
					recipients: args.createForm.recipients,
					signatureFields: args.createForm.signatureFields ?? [],
					emailSubject: args.createForm.emailSubject,
					emailMessage: args.createForm.emailMessage,
					documents: args.createForm.documents.map((doc) => ({
						id: doc.id,
						name: doc.name,
						size: doc.size,
						type: doc.type,
					})),
				});

				if (args.mode === "create") {
					await uploadOrgTemplateDocuments({
						templateId: args.templateId,
						organizationId: args.organizationId,
						orgEncryptionPublicKey: args.orgEncryptionPublicKey,
						name: args.templateName.trim(),
						snapshot,
						documents: documentRows,
						prepareCreate: (body) => prepareCreate.mutateAsync(body),
						create: (body) => createTemplate.mutateAsync(body),
					});
					toastUser.success(TOASTS.templates.created);
					return;
				}

				await uploadOrgTemplateDocuments({
					templateId: args.templateId,
					organizationId: args.organizationId,
					orgEncryptionPublicKey: args.orgEncryptionPublicKey,
					name: args.templateName.trim(),
					snapshot,
					documents: documentRows,
					prepareCreate: (body) => prepareUpdate.mutateAsync(body),
					create: (body) =>
						updateTemplate.mutateAsync({
							templateId: body.templateId,
							name: body.name,
							headDekWrappedOmk: body.headDekWrappedOmk,
							headOmkKemCiphertext: body.headOmkKemCiphertext,
							snapshot: body.snapshot,
							documents: body.documents,
						}),
				});
				toastUser.success(TOASTS.templates.saved);
			} catch (err) {
				showAppErrorToast(err);
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[createTemplate, prepareCreate, prepareUpdate, updateTemplate],
	);

	return { saveTemplate, saving };
}
