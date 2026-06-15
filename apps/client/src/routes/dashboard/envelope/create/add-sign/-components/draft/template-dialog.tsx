import {
	useActiveOrganization,
	useActiveOrgId,
	useCreateOrgTemplate,
	usePrepareOrgTemplateCreate,
} from "@filosign/react/orgs";
import { uploadOrgTemplateDocuments } from "@filosign/react/utils";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { loadDocumentBytes } from "@/src/lib/domains/drafts";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { buildTemplateSnapshotFromComposer } from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	createForm: CreateForm | null;
	initialName: string;
};

export function DraftTemplateDialog({
	open,
	onOpenChange,
	createForm,
	initialName,
}: Props) {
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const prepareCreate = usePrepareOrgTemplateCreate();
	const createTemplate = useCreateOrgTemplate();
	const [templateName, setTemplateName] = useState(initialName);
	const [templateSaving, setTemplateSaving] = useState(false);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (next) setTemplateName(initialName);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Save as template</DialogTitle>
					<DialogDescription>
						Create a reusable blueprint from this draft layout.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="designer-template-name">Template name</Label>
						<Input
							id="designer-template-name"
							placeholder="E.g. Standard NDA"
							value={templateName}
							onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
								setTemplateName(event.target.value)
							}
							maxLength={120}
							autoFocus
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={templateSaving}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						onClick={async () => {
							if (!templateName.trim()) {
								toastUser.error(TOASTS.templates.nameRequired.title);
								return;
							}
							if (!createForm?.documents.length) {
								toastUser.error("Add at least one document before saving.");
								return;
							}
							if (!activeOrgId || !activeOrg?.encryptionPublicKey) {
								toastUser.error("Select a workspace before saving a template.");
								return;
							}

							setTemplateSaving(true);
							try {
								const templateId = crypto.randomUUID();
								const documentRows = await Promise.all(
									createForm.documents.map(async (doc) => ({
										docId: doc.id,
										name: doc.name,
										size: doc.size,
										mimeType: doc.type,
										bytes: await loadDocumentBytes(createForm.draftId, {
											id: doc.id,
											name: doc.name,
											size: doc.size,
											type: doc.type,
										}),
									})),
								);
								const snapshot = buildTemplateSnapshotFromComposer({
									recipients: createForm.recipients,
									signatureFields: createForm.signatureFields ?? [],
									emailSubject: createForm.emailSubject,
									emailMessage: createForm.emailMessage,
									documents: createForm.documents.map((doc) => ({
										id: doc.id,
										name: doc.name,
										size: doc.size,
										type: doc.type,
									})),
								});

								await uploadOrgTemplateDocuments({
									templateId,
									organizationId: activeOrgId,
									orgEncryptionPublicKey: activeOrg.encryptionPublicKey,
									name: templateName.trim(),
									snapshot,
									documents: documentRows,
									prepareCreate: (body) => prepareCreate.mutateAsync(body),
									create: (body) => createTemplate.mutateAsync(body),
								});
								toastUser.success(TOASTS.templates.saved);
								onOpenChange(false);
							} catch (err) {
								showAppErrorToast(err);
							} finally {
								setTemplateSaving(false);
							}
						}}
						disabled={templateSaving || !templateName.trim()}
					>
						{templateSaving ? "Saving..." : "Save template"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
