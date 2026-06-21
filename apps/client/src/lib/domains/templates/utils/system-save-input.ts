import type { SaveSystemTemplateInput } from "@filosign/react/utils";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { buildTemplateSnapshotFromComposer } from "@/src/lib/domains/templates/template-composer";
import {
	loadTemplateDocumentBytes,
	templateDocumentMetaFromCreateForm,
} from "@/src/lib/domains/templates/template-document-meta";

export async function buildSystemTemplateSaveInput(args: {
	createForm: CreateForm;
	systemTemplateId: string;
	templateName: string;
}): Promise<
	Pick<
		SaveSystemTemplateInput,
		"snapshot" | "documents" | "loadDocumentBytes" | "name" | "systemTemplateId"
	>
> {
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
		systemTemplateId: args.systemTemplateId,
		name: args.templateName.trim(),
		snapshot,
		documents,
		loadDocumentBytes: loadTemplateDocumentBytes({
			createForm: args.createForm,
		}),
	};
}
