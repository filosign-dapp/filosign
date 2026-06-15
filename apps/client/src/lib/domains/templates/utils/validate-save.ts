import { templateRolePlaceholderEmail } from "@filosign/shared";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { templateRolesFromCreateForm } from "../template-composer";

export function missingTemplateSignerFieldRoleLabel(
	createForm: CreateForm,
): string | null {
	const roles = templateRolesFromCreateForm(createForm).filter(
		(role) => role.kind === "signer",
	);

	for (const role of roles) {
		const assigneeEmail = templateRolePlaceholderEmail(role.roleId);
		const hasPlacementField = (createForm.signatureFields ?? []).some(
			(field) =>
				field.assignedSignerEmail === assigneeEmail &&
				(field.type === "signature" || field.type === "initial"),
		);
		if (!hasPlacementField) {
			return role.label;
		}
	}

	return null;
}
