import { useActiveOrganization, useActiveOrgId } from "@filosign/react/orgs";
import { FloppyDiskIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { useTemplateEditorSave } from "@/src/lib/domains/templates/use-template-editor-save";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { TemplateSaveDialog } from "./template-save-dialog";

type Props = {
	mode: "create" | "edit";
	templateId: string;
	templateName: string;
};

export function TemplateEditorActions({
	mode,
	templateId,
	templateName,
}: Props) {
	const navigate = useNavigate();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const createForm = useStorePersist((s) => s.createForm);
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const { saveTemplate, saving } = useTemplateEditorSave();
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);

	const handleSave = useCallback(
		async (name: string) => {
			if (
				!templateId ||
				!activeOrgId ||
				!activeOrg?.encryptionPublicKey ||
				!createForm
			) {
				return;
			}
			if (!name.trim()) {
				toastUser.error(TOASTS.templates.nameRequired.title);
				return;
			}

			try {
				await saveTemplate({
					createForm,
					templateId,
					templateName: name.trim(),
					organizationId: activeOrgId,
					orgEncryptionPublicKey: activeOrg.encryptionPublicKey,
					mode,
				});
				setSaveDialogOpen(false);
				clearCreateForm();
				void navigate({ to: "/dashboard/templates" });
			} catch (err) {
				showAppErrorToast(err);
			}
		},
		[
			activeOrg?.encryptionPublicKey,
			activeOrgId,
			clearCreateForm,
			createForm,
			mode,
			navigate,
			saveTemplate,
			templateId,
		],
	);

	return (
		<>
			<Button
				type="button"
				variant="primary"
				size="lg"
				className="gap-2"
				disabled={saving || !createForm?.documents.length}
				isLoading={saving}
				onClick={() => {
					if (mode === "edit" && templateName.trim()) {
						void handleSave(templateName.trim());
						return;
					}
					setSaveDialogOpen(true);
				}}
			>
				<FloppyDiskIcon className="size-4" />
				<span className="hidden sm:inline">Save template</span>
			</Button>
			<TemplateSaveDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				defaultName={templateName || createForm?.emailSubject || ""}
				isSaving={saving}
				onConfirm={(name) => {
					void handleSave(name);
				}}
			/>
		</>
	);
}
