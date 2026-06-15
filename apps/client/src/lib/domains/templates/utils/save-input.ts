import type { SaveOrgTemplateInput } from "@filosign/react/utils";
import type { Hex } from "viem";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { buildTemplateSnapshotFromComposer } from "@/src/lib/domains/templates/template-composer";
import {
	loadTemplateDocumentBytes,
	templateDocumentMetaFromCreateForm,
} from "@/src/lib/domains/templates/template-document-meta";

export async function buildTemplateSaveInput(args: {
	createForm: CreateForm;
	templateId: string;
	templateName: string;
	organizationId: string;
	orgEncryptionPublicKey: Hex;
}): Promise<SaveOrgTemplateInput> {
	const [documents, snapshot] = await Promise.all([
		templateDocumentMetaFromCreateForm({ createForm: args.createForm }),
		Promise.resolve(
			buildTemplateSnapshotFromComposer({
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
			}),
		),
	]);

	return {
		templateId: args.templateId,
		organizationId: args.organizationId,
		orgEncryptionPublicKey: args.orgEncryptionPublicKey,
		name: args.templateName.trim(),
		snapshot,
		documents,
		loadDocumentBytes: loadTemplateDocumentBytes({
			createForm: args.createForm,
		}),
	};
}
