import {
	useActiveOrganization,
	useActiveOrgId,
	useSaveOrgTemplateDeps,
} from "@filosign/react/orgs";
import { saveOrgTemplateCreate } from "@filosign/react/utils";
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
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { buildTemplateSaveInput } from "@/src/lib/domains/templates/utils/save-input";
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
	const deps = useSaveOrgTemplateDeps();
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
							if (!deps) {
								toastUser.error(
									"Connect your wallet before saving a template.",
								);
								return;
							}

							setTemplateSaving(true);
							try {
								const templateId = crypto.randomUUID();
								await saveOrgTemplateCreate(
									deps,
									await buildTemplateSaveInput({
										createForm,
										templateId,
										templateName,
										organizationId: activeOrgId,
										orgEncryptionPublicKey: activeOrg.encryptionPublicKey,
									}),
								);
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
