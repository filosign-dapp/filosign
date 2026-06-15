import type { TemplateRole, TemplateRoleKind } from "@filosign/shared";
import { countFieldsForRole } from "@filosign/shared";
import { useEffect, useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { templateEditorStateFromCreateForm } from "@/src/lib/domains/templates/template-composer";
import { useStorePersist } from "@/src/lib/filosign/use-store";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role: TemplateRole | null;
	onSave: (patch: { label: string; kind: TemplateRoleKind }) => void;
	onRemove: (roleId: string) => void;
};

export function TemplateRoleEditorDialog({
	open,
	onOpenChange,
	role,
	onSave,
	onRemove,
}: Props) {
	const createForm = useStorePersist((s) => s.createForm);
	const [label, setLabel] = useState("");
	const [kind, setKind] = useState<TemplateRoleKind>("signer");
	const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

	useEffect(() => {
		if (!open || !role) return;
		setLabel(role.label);
		setKind(role.kind);
	}, [open, role]);

	if (!role) return null;

	const fieldCount = createForm
		? countFieldsForRole({
				state: templateEditorStateFromCreateForm(createForm),
				roleId: role.roleId,
			})
		: 0;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit template role</DialogTitle>
						<DialogDescription>
							Roles define who gets fields when someone uses this template.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-2">
							<Label htmlFor="template-role-label">Label</Label>
							<Input
								id="template-role-label"
								value={label}
								maxLength={80}
								onChange={(event) => setLabel(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Role type</Label>
							<Select
								value={kind}
								onValueChange={(value) => {
									if (value === "signer" || value === "viewer") {
										setKind(value);
									}
								}}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="signer">Signer</SelectItem>
									<SelectItem value="viewer">Viewer</SelectItem>
								</SelectContent>
							</Select>
							{kind === "viewer" && fieldCount > 0 ? (
								<p className="text-xs text-muted-foreground">
									Switching to viewer removes {fieldCount} placed field
									{fieldCount === 1 ? "" : "s"} on this role.
								</p>
							) : null}
						</div>
					</div>
					<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
						<Button
							type="button"
							variant="ghost"
							className="text-destructive hover:text-destructive"
							onClick={() => setConfirmRemoveOpen(true)}
						>
							Remove role
						</Button>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="primary"
								disabled={!label.trim()}
								onClick={() => {
									onSave({ label: label.trim(), kind });
									onOpenChange(false);
								}}
							>
								Save role
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ConfirmAlertDialog
				open={confirmRemoveOpen}
				onOpenChange={setConfirmRemoveOpen}
				title="Remove this role?"
				description={
					fieldCount > 0
						? `This removes the role and ${fieldCount} placed field${fieldCount === 1 ? "" : "s"}.`
						: "This removes the role from the template."
				}
				confirmLabel="Remove role"
				destructive
				onConfirm={() => {
					onRemove(role.roleId);
					setConfirmRemoveOpen(false);
					onOpenChange(false);
				}}
			/>
		</>
	);
}
