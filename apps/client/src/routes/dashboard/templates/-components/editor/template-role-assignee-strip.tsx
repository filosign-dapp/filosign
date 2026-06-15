import {
	countFieldsForRole,
	templateRolePlaceholderEmail,
} from "@filosign/shared";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { useAddSignPlacement } from "@/src/lib/domains/placement/context";
import { templateEditorStateFromCreateForm } from "@/src/lib/domains/templates/template-composer";
import { useTemplateRoles } from "@/src/lib/domains/templates/use-template-roles";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import { TemplateRolesManageSheet } from "./template-roles-manage-sheet";

export function TemplateRoleAssigneeStrip() {
	const createForm = useStorePersist((s) => s.createForm);
	const { roles } = useTemplateRoles();
	const { activeAssigneeId, setActiveAssigneeId } = useAddSignPlacement();
	const [manageOpen, setManageOpen] = useState(false);

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

	if (roles.length === 0) {
		return (
			<div className="space-y-2">
				<p className="text-xs text-muted-foreground">
					Add a role to start placing fields.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8"
					onClick={() => setManageOpen(true)}
				>
					Manage roles
				</Button>
				<TemplateRolesManageSheet
					open={manageOpen}
					onOpenChange={setManageOpen}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs font-medium text-muted-foreground">Assign to</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs"
					onClick={() => setManageOpen(true)}
				>
					Manage roles
				</Button>
			</div>
			<div className="flex flex-wrap gap-1.5">
				{roles.map((role) => {
					const assigneeId = templateRolePlaceholderEmail(role.roleId);
					const count = fieldCounts.get(role.roleId) ?? 0;
					const placementEnabled = role.kind === "signer";
					const isActive = activeAssigneeId === assigneeId;
					return (
						<button
							key={role.roleId}
							type="button"
							disabled={!placementEnabled}
							title={
								placementEnabled
									? role.label
									: "Viewer roles cannot receive fields"
							}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
								!placementEnabled &&
									"cursor-not-allowed opacity-50 hover:border-border/60 hover:text-muted-foreground",
								placementEnabled &&
									(isActive
										? "border-primary bg-primary/10 font-medium text-primary"
										: "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"),
							)}
							onClick={() => {
								if (!placementEnabled) return;
								setActiveAssigneeId(assigneeId);
							}}
						>
							{role.label}
							{count > 0 ? (
								<span
									className={cn(
										"inline-flex min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none",
										isActive
											? "bg-primary/20 text-primary"
											: "bg-muted text-muted-foreground",
									)}
								>
									{count}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
			<TemplateRolesManageSheet
				open={manageOpen}
				onOpenChange={setManageOpen}
			/>
		</div>
	);
}
