import type { TemplateRoleKind } from "@filosign/shared";
import { useCallback } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import {
	applyTemplateEditorMutation,
	templateRolesFromCreateForm,
} from "@/src/lib/domains/templates/template-composer";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export function useTemplateRoles() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);

	const roles = createForm ? templateRolesFromCreateForm(createForm) : [];

	const mutate = useCallback(
		(mutation: Parameters<typeof applyTemplateEditorMutation>[1]): boolean => {
			const current = useStorePersist.getState().createForm;
			if (!current) return false;
			try {
				setCreateForm(applyTemplateEditorMutation(current, mutation));
				return true;
			} catch (err) {
				toastUser.error(
					err instanceof Error
						? err.message
						: "Could not update template role.",
				);
				return false;
			}
		},
		[setCreateForm],
	);

	const addRole = useCallback(
		(args?: { kind?: TemplateRoleKind; label?: string }) =>
			mutate({ type: "addRole", kind: args?.kind, label: args?.label }),
		[mutate],
	);

	const updateRole = useCallback(
		(roleId: string, patch: { label?: string; kind?: TemplateRoleKind }) =>
			mutate({
				type: "updateRole",
				roleId,
				label: patch.label,
				kind: patch.kind,
			}),
		[mutate],
	);

	const removeRole = useCallback(
		(roleId: string) => mutate({ type: "removeRole", roleId }),
		[mutate],
	);

	return {
		roles,
		addRole,
		updateRole,
		removeRole,
	};
}
