import { FloppyDiskIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { useSystemTemplateEditorSave } from "@/src/lib/domains/templates/use-system-template-editor-save";
import { deriveTemplateDisplayName } from "@/src/lib/domains/templates/utils/display-name";
import { missingTemplateSignerFieldRoleLabel } from "@/src/lib/domains/templates/utils/validate-save";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { SystemTemplateSaveDialog } from "./system-template-save-dialog";

type Props = {
	mode: "system-create" | "system-edit";
	systemTemplateId: string;
	templateName: string;
	defaultCategory?: string;
	defaultDocumentVersion?: string;
	defaultTags?: string[];
};

export function SystemTemplateEditorActions({
	mode,
	systemTemplateId,
	templateName,
	defaultCategory,
	defaultDocumentVersion,
	defaultTags,
}: Props) {
	const navigate = useNavigate();
	const createForm = useStorePersist((s) => s.createForm);
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const { saveSystemTemplate, saving } = useSystemTemplateEditorSave();
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);

	const handleSave = useCallback(
		async (args: {
			name: string;
			category: string;
			documentVersion: string;
			tags: string[];
		}) => {
			if (!createForm) return;

			await saveSystemTemplate({
				createForm,
				systemTemplateId,
				templateName: args.name,
				mode,
				meta: {
					category: args.category,
					documentVersion: args.documentVersion,
					tags: args.tags,
					sortOrder: 0,
				},
			});
			setSaveDialogOpen(false);
			void navigate({ to: "/dashboard/admin/system-templates" });
			clearCreateForm();
		},
		[
			clearCreateForm,
			createForm,
			mode,
			navigate,
			saveSystemTemplate,
			systemTemplateId,
		],
	);

	const openSaveDialog = useCallback(() => {
		if (!createForm) return;
		const missingRoleLabel = missingTemplateSignerFieldRoleLabel(createForm);
		if (missingRoleLabel) {
			toastUser.error(
				`Please place at least one field for ${missingRoleLabel}.`,
			);
			return;
		}
		setSaveDialogOpen(true);
	}, [createForm]);

	return (
		<>
			<Button
				type="button"
				variant="primary"
				size="lg"
				className="gap-2"
				disabled={saving || !createForm?.documents.length}
				isLoading={saving}
				onClick={openSaveDialog}
			>
				<FloppyDiskIcon className="size-4" />
				<span className="hidden sm:inline">Save template</span>
			</Button>
			<SystemTemplateSaveDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				defaultName={deriveTemplateDisplayName(
					templateName || createForm?.emailSubject || "",
					"",
				)}
				defaultCategory={defaultCategory}
				defaultDocumentVersion={defaultDocumentVersion}
				defaultTags={defaultTags}
				isSaving={saving}
				onConfirm={(args) => {
					void handleSave(args);
				}}
			/>
		</>
	);
}
