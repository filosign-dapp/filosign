import {
	useCreateOrganization,
	useInviteOrgMember,
} from "@filosign/react/orgs";
import {
	BuildingsIcon,
	GearIcon,
	PlusIcon,
	UserPlusIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { BillingSection } from "./billing-section";
import { MembersSection } from "./members-section";
import { TemplatesSection } from "./templates-section";

function CreateWorkspaceDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const [name, setName] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		try {
			const res = await createOrg.mutateAsync({ name: name.trim() });
			if (res?.organization?.id) {
				setActiveOrg(res.organization.id);
				toast.success("Workspace created!");
				props.onOpenChange(false);
				setName("");
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create workspace",
			);
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create new workspace</DialogTitle>
					<DialogDescription>
						A workspace is where you work, organize drafts, and invite members.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="create-ws-name">Workspace Name</Label>
						<Input
							id="create-ws-name"
							placeholder="Acme Corp"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => props.onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={createOrg.isPending || !name.trim()}
						>
							{createOrg.isPending ? "Creating..." : "Create Workspace"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function InviteTeammateDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const inviteMember = useInviteOrgMember();
	const [email, setEmail] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		try {
			await inviteMember.mutateAsync({ email: email.trim() });
			toast.success("Teammate invited successfully!");
			setEmail("");
			props.onOpenChange(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to invite teammate",
			);
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite teammate to workspace</DialogTitle>
					<DialogDescription>
						Enter your teammate's email address. Once they register/login, they
						will be automatically added to this workspace.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="invite-email-ws">Email Address</Label>
						<Input
							id="invite-email-ws"
							type="email"
							placeholder="colleague@company.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => props.onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={inviteMember.isPending || !email.includes("@")}
						>
							{inviteMember.isPending ? "Inviting..." : "Invite"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function WorkspaceDetailsSection() {
	const { orgDetail, updateOrg, activeMembership } = useWorkspaceSettings();
	const [wsName, setWsName] = useState("");

	useEffect(() => {
		if (orgDetail.data?.organization?.name) {
			setWsName(orgDetail.data.organization.name);
		}
	}, [orgDetail.data?.organization?.name]);

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!wsName.trim()) return;
		try {
			await updateOrg.mutateAsync({ name: wsName.trim() });
			toast.success("Workspace updated successfully!");
			void orgDetail.refetch();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update workspace",
			);
		}
	};

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	if (!orgDetail.data?.organization) return null;

	return (
		<section className="space-y-4 rounded-lg border border-border p-6 bg-card/30">
			<div className="flex items-center gap-2">
				<GearIcon className="size-5 text-muted-foreground" />
				<h2 className="text-sm font-semibold text-foreground">
					Workspace Details
				</h2>
			</div>
			<form onSubmit={handleUpdate} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="ws-name-input">Workspace Name</Label>
					<Input
						id="ws-name-input"
						placeholder="Acme Corp"
						value={wsName}
						disabled={!canManage}
						onChange={(e) => setWsName(e.target.value)}
					/>
				</div>
				{canManage && (
					<Button
						type="submit"
						variant="primary"
						disabled={
							updateOrg.isPending ||
							!wsName.trim() ||
							wsName.trim() === orgDetail.data.organization.name
						}
					>
						{updateOrg.isPending ? "Saving..." : "Save changes"}
					</Button>
				)}
			</form>
		</section>
	);
}

export function WorkspaceSettingsPage() {
	const { activeOrgId, canInviteMembers } = useWorkspaceSettings();
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	return (
		<div className="mx-auto max-w-4xl space-y-8 px-8 py-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
				<div>
					<h1 className="text-2xl font-normal tracking-tight text-foreground">
						Workspace Settings
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage your workspace, templates, and teammates.
					</p>
				</div>
				<div className="flex items-center gap-2.5 self-start sm:self-center">
					{canInviteMembers && (
						<Button
							type="button"
							variant="primary"
							className="gap-2 text-xs h-9 px-3"
							onClick={() => setIsInviteOpen(true)}
						>
							<UserPlusIcon className="size-4" />
							Invite Member
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						className="gap-2 text-xs h-9 px-3"
						onClick={() => setIsCreateOpen(true)}
					>
						<PlusIcon className="size-4" />
						New Workspace
					</Button>
				</div>
			</div>

			{activeOrgId ? (
				<div className="space-y-8">
					<WorkspaceDetailsSection />
					<BillingSection />
					<MembersSection />
					<TemplatesSection />
				</div>
			) : (
				<div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg text-center space-y-4">
					<BuildingsIcon className="size-12 text-muted-foreground opacity-55" />
					<div className="space-y-1">
						<h3 className="font-semibold text-foreground">
							No active workspace
						</h3>
						<p className="text-sm text-muted-foreground">
							Create or select a workspace to get started.
						</p>
					</div>
					<Button
						type="button"
						variant="primary"
						onClick={() => setIsCreateOpen(true)}
					>
						Create Workspace
					</Button>
				</div>
			)}

			<InviteTeammateDialog
				open={isInviteOpen}
				onOpenChange={setIsInviteOpen}
			/>
			<CreateWorkspaceDialog
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
			/>
		</div>
	);
}
