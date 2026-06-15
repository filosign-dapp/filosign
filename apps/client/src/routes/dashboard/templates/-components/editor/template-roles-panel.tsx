import type { TemplateRole } from "@filosign/shared";
import { countFieldsForRole } from "@filosign/shared";
import {
	DotsThreeVerticalIcon,
	PlusIcon,
	UserCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { templateEditorStateFromCreateForm } from "@/src/lib/domains/templates/template-composer";
import { useTemplateRoles } from "@/src/lib/domains/templates/use-template-roles";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import { useAddSignPlacement } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { TemplateRoleEditorDialog } from "./template-role-editor-dialog";

export function TemplateRolesPanel() {
	const createForm = useStorePersist((s) => s.createForm);
	const { roles, addRole, updateRole, removeRole } = useTemplateRoles();
	const { activeAssigneeId, setActiveAssigneeId } = useAddSignPlacement();
	const [editingRole, setEditingRole] = useState<TemplateRole | null>(null);

	const fieldCounts = useMemo(() => {
		if (!createForm) return new Map<string, number>();
		const state = templateEditorStateFromCreateForm(createForm);
		return new Map(
			roles.map((role) => [
				role.roleId,
				countFieldsForRole({ state, roleId: role.roleId }),
			]),
		);
	}, [createForm, roles]);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-medium text-foreground">Template roles</h3>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 gap-1"
					onClick={() => addRole()}
				>
					<PlusIcon className="size-3.5" weight="bold" />
					Add role
				</Button>
			</div>
			<p className="text-xs text-muted-foreground">
				Select a role, then place fields for that role on the document.
			</p>
			<div className="space-y-2">
				{roles.map((role) => {
					const isActive = activeAssigneeId === role.roleId;
					const fieldCount = fieldCounts.get(role.roleId) ?? 0;
					const placementEnabled = role.kind === "signer";
					return (
						<div
							key={role.roleId}
							className={cn(
								"flex items-center gap-2 rounded-lg border p-2 transition-colors",
								isActive
									? "border-primary/40 bg-primary/5"
									: "border-border/60 hover:border-border",
								!placementEnabled && "opacity-80",
							)}
						>
							<button
								type="button"
								className="flex min-w-0 flex-1 items-center gap-2 text-left"
								onClick={() => {
									if (placementEnabled) {
										setActiveAssigneeId(role.roleId);
									}
								}}
								disabled={!placementEnabled}
							>
								<UserCircleIcon
									className="size-5 shrink-0 text-muted-foreground"
									weight="duotone"
								/>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{role.label}</p>
									<p className="text-xs text-muted-foreground">
										{fieldCount} field{fieldCount === 1 ? "" : "s"}
									</p>
								</div>
							</button>
							<Badge variant="secondary" className="shrink-0 capitalize">
								{role.kind}
							</Badge>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className="shrink-0"
										/>
									}
								>
									<DotsThreeVerticalIcon className="size-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => setEditingRole(role)}>
										Edit role
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => removeRole(role.roleId)}
									>
										Remove role
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				})}
			</div>

			<TemplateRoleEditorDialog
				open={editingRole !== null}
				onOpenChange={(open) => {
					if (!open) setEditingRole(null);
				}}
				role={editingRole}
				onSave={(patch) => {
					if (!editingRole) return;
					updateRole(editingRole.roleId, patch);
				}}
				onRemove={removeRole}
			/>
		</div>
	);
}
