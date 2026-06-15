import { countFieldsForDocument, countFieldsForRole } from "@filosign/shared";
import { FilePdfIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Badge } from "@/src/lib/components/ui/badge";
import { useAddSignChrome } from "@/src/lib/domains/placement/context";
import {
	templateEditorStateFromCreateForm,
	templateRolesFromCreateForm,
} from "@/src/lib/domains/templates/template-composer";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";

export function TemplatePreviewContextRailContent() {
	const createForm = useStorePersist((s) => s.createForm);
	const { currentDocumentId, handleDocumentSelect } = useAddSignChrome();
	const roles = useMemo(
		() => (createForm ? templateRolesFromCreateForm(createForm) : []),
		[createForm],
	);
	const documents = createForm?.documents ?? [];

	const fieldCountsByRole = useMemo(() => {
		if (!createForm) return new Map<string, number>();
		const state = templateEditorStateFromCreateForm(createForm);
		return new Map(
			roles.map((role) => [
				role.roleId,
				countFieldsForRole({ state, roleId: role.roleId }),
			]),
		);
	}, [createForm, roles]);

	const fieldCountsByDoc = useMemo(() => {
		if (!createForm) return new Map<string, number>();
		const state = templateEditorStateFromCreateForm(createForm);
		return new Map(
			documents.map((doc) => [
				doc.id,
				countFieldsForDocument({ state, documentId: doc.id }),
			]),
		);
	}, [createForm, documents]);

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h3 className="text-sm font-medium text-foreground">Roles</h3>
				<ul className="space-y-2">
					{roles.map((role) => (
						<li
							key={role.roleId}
							className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2 text-sm"
						>
							<span className="flex min-w-0 items-center gap-2">
								<UserCircleIcon
									className="size-4 shrink-0 text-muted-foreground"
									weight="duotone"
								/>
								<span className="truncate">{role.label}</span>
							</span>
							<div className="flex shrink-0 items-center gap-2">
								<Badge variant="secondary" className="capitalize">
									{role.kind}
								</Badge>
								<span className="text-xs text-muted-foreground">
									{fieldCountsByRole.get(role.roleId) ?? 0} fields
								</span>
							</div>
						</li>
					))}
				</ul>
			</div>

			<div className="space-y-3">
				<h3 className="text-sm font-medium text-foreground">Documents</h3>
				<ul className="space-y-2">
					{documents.map((doc) => {
						const active = doc.id === currentDocumentId;
						return (
							<li key={doc.id}>
								<button
									type="button"
									onClick={() => handleDocumentSelect(doc.id)}
									className={cn(
										"flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
										active
											? "border-primary/40 bg-primary/5"
											: "border-border/50 hover:bg-muted/30",
									)}
								>
									<FilePdfIcon
										className="size-4 shrink-0 text-muted-foreground"
										weight="duotone"
									/>
									<span className="min-w-0 flex-1 truncate">{doc.name}</span>
									<span className="shrink-0 text-xs text-muted-foreground">
										{fieldCountsByDoc.get(doc.id) ?? 0} fields
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
