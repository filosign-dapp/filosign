import type { TemplateRole, TemplateSnapshot } from "@filosign/shared";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Badge } from "@/src/lib/components/ui/badge";
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

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templateName: string;
	snapshot: TemplateSnapshot;
	docCount: number;
	fieldCount: number;
	onConfirm: (
		assignments: Record<string, { name: string; email: string }>,
	) => void | Promise<void>;
	pending?: boolean;
};

export function TemplateRoleAssignmentDialog({
	open,
	onOpenChange,
	templateName,
	snapshot,
	docCount,
	fieldCount,
	onConfirm,
	pending = false,
}: Props) {
	const roles = useMemo(
		() => [...snapshot.roles].sort((a, b) => a.order - b.order),
		[snapshot.roles],
	);
	const signerRoles = useMemo(
		() => roles.filter((role) => role.kind === "signer"),
		[roles],
	);
	const viewerRoles = useMemo(
		() => roles.filter((role) => role.kind === "viewer"),
		[roles],
	);
	const [assignments, setAssignments] = useState<
		Record<string, { name: string; email: string }>
	>({});

	const setRoleAssignment = (
		role: TemplateRole,
		patch: Partial<{ name: string; email: string }>,
	) => {
		setAssignments((prev) => ({
			...prev,
			[role.roleId]: {
				name: patch.name ?? prev[role.roleId]?.name ?? role.label,
				email: patch.email ?? prev[role.roleId]?.email ?? "",
			},
		}));
	};

	const handleConfirm = () => {
		const payload: Record<string, { name: string; email: string }> = {};
		for (const role of roles) {
			const email = assignments[role.roleId]?.email.trim() ?? "";
			const name = assignments[role.roleId]?.name.trim() || role.label;
			if (role.kind === "signer" && !z.email().safeParse(email).success) {
				toastUser.error(`Enter a valid email for ${role.label}.`);
				return;
			}
			if (
				role.kind === "viewer" &&
				email.length > 0 &&
				!z.email().safeParse(email).success
			) {
				toastUser.error(`Enter a valid email for ${role.label}.`);
				return;
			}
			payload[role.roleId] = { name, email };
		}
		void onConfirm(payload);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Use template</DialogTitle>
					<DialogDescription>
						Assign people to each role for <strong>{templateName}</strong>{" "}
						before opening the send designer.
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
					<p className="font-medium text-foreground">{templateName}</p>
					<p className="mt-1">
						{docCount} document{docCount === 1 ? "" : "s"} · {fieldCount} field
						{fieldCount === 1 ? "" : "s"} · {roles.length} role
						{roles.length === 1 ? "" : "s"}
					</p>
				</div>

				<div className="max-h-[50vh] space-y-5 overflow-y-auto pt-1">
					{signerRoles.length > 0 ? (
						<div className="space-y-3">
							<h4 className="text-sm font-medium">Signers</h4>
							{signerRoles.map((role) => (
								<RoleAssignmentRow
									key={role.roleId}
									role={role}
									assignments={assignments}
									onChange={setRoleAssignment}
									required
								/>
							))}
						</div>
					) : null}

					{viewerRoles.length > 0 ? (
						<div className="space-y-3">
							<h4 className="text-sm font-medium">Viewers</h4>
							{viewerRoles.map((role) => (
								<RoleAssignmentRow
									key={role.roleId}
									role={role}
									assignments={assignments}
									onChange={setRoleAssignment}
								/>
							))}
						</div>
					) : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={pending}
						isLoading={pending}
						onClick={handleConfirm}
					>
						{pending ? "Preparing envelope..." : "Continue to send"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function RoleAssignmentRow({
	role,
	assignments,
	onChange,
	required = false,
}: {
	role: TemplateRole;
	assignments: Record<string, { name: string; email: string }>;
	onChange: (
		role: TemplateRole,
		patch: Partial<{ name: string; email: string }>,
	) => void;
	required?: boolean;
}) {
	return (
		<div className="grid gap-3 rounded-lg border border-border/50 p-3 sm:grid-cols-2">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<Label>{role.label}</Label>
					<Badge variant="secondary" className="capitalize">
						{role.kind}
					</Badge>
				</div>
				<p className="text-xs text-muted-foreground">
					{required ? "Required for send" : "Optional viewer access"}
				</p>
			</div>
			<div className="space-y-2 sm:col-span-1">
				<Input
					placeholder="Name"
					value={assignments[role.roleId]?.name ?? role.label}
					onChange={(e) => onChange(role, { name: e.target.value })}
				/>
				<Input
					type="email"
					placeholder={required ? "Email" : "Email (optional)"}
					value={assignments[role.roleId]?.email ?? ""}
					onChange={(e) => onChange(role, { email: e.target.value })}
					required={required}
				/>
			</div>
		</div>
	);
}
