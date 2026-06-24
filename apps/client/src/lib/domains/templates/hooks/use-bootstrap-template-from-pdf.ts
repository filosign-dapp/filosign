import {
	createTemplateRoleId,
	TEMPLATE_LIMITS,
	templateRolePlaceholderEmail,
} from "@filosign/shared";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { buildCreateForm } from "@/src/lib/domains/drafts";
import { deriveTemplateDisplayName } from "@/src/lib/domains/templates/utils/display-name";
import { useStorePersist } from "@/src/lib/filosign/use-store";

type BootstrapArgs = {
	files: File[];
	templateId: string;
	navigateTo: {
		to: "/dashboard/templates/new" | "/admin/system-templates/new";
		search?: { templateName: string };
	};
	templateContext:
		| { templateId: string; mode: "create" }
		| {
				templateId: string;
				systemTemplateId: string;
				mode: "system-create";
		  };
};

function validateTemplatePdfFiles(files: File[]): boolean {
	if (files.length === 0) return false;

	const invalid = files.find((file) => file.type !== "application/pdf");
	if (invalid) {
		toastUser.error("Upload PDF files only.");
		return false;
	}

	if (files.length > TEMPLATE_LIMITS.MAX_TEMPLATE_DOCUMENTS) {
		toastUser.error(
			`You can upload a maximum of ${TEMPLATE_LIMITS.MAX_TEMPLATE_DOCUMENTS} documents.`,
		);
		return false;
	}

	const oversized = files.filter(
		(file) => file.size > TEMPLATE_LIMITS.MAX_FILE_SIZE,
	);
	if (oversized.length > 0) {
		toastUser.error(
			`Documents exceed the maximum file size of ${TEMPLATE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB: ${oversized.map((f) => f.name).join(", ")}`,
		);
		return false;
	}

	const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
	if (totalBytes > TEMPLATE_LIMITS.MAX_TEMPLATE_TOTAL_BYTES) {
		toastUser.error(
			`Total size of documents exceeds the limit of ${TEMPLATE_LIMITS.MAX_TEMPLATE_TOTAL_BYTES / (1024 * 1024)}MB.`,
		);
		return false;
	}

	return true;
}

export function useBootstrapTemplateFromPdfUpload() {
	const navigate = useNavigate();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);

	const bootstrapFromPdfFiles = useCallback(
		async (args: BootstrapArgs) => {
			if (!validateTemplatePdfFiles(args.files)) return;

			const roleId = createTemplateRoleId();
			const defaultName = deriveTemplateDisplayName(
				args.files[0].name.replace(/\.pdf$/i, ""),
			);
			const draft = await buildCreateForm(
				{
					documents: args.files.map((file) => ({
						id: crypto.randomUUID(),
						file,
						name: file.name,
						size: file.size,
						type: file.type,
					})),
					recipients: [
						{
							clientRowId: roleId,
							name: "",
							templateRoleLabel: "Signer 1",
							email: templateRolePlaceholderEmail(roleId),
							role: "signer",
						},
					],
					emailMessage: "",
					emailSubject: defaultName,
					settlementDrafts: [],
				},
				null,
			);

			setCreateForm({
				...draft,
				templateContext: args.templateContext,
			});
			void navigate({
				to: args.navigateTo.to,
				search: args.navigateTo.search ?? { templateName: defaultName },
			});
		},
		[navigate, setCreateForm],
	);

	return { bootstrapFromPdfFiles };
}
