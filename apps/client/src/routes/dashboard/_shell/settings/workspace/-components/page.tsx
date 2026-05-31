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
import { PayoutFeatureAccessSection } from "./payout-feature-access-section";
import { WorkspaceSection } from "./workspace-section";

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
				toast.success("Workspace created");
				props.onOpenChange(false);
				setName("");
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not create workspace",
			);
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="overscroll-contain">
				<DialogHeader>
					<DialogTitle>Create workspace</DialogTitle>
					<DialogDescription>
						A workspace holds your team, billing, drafts, and shared templates.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="create-ws-name">Workspace name</Label>
						<Input
							id="create-ws-name"
							name="workspaceName"
							placeholder="Acme Corp…"
							autoComplete="organization"
							value={name}
							onChange={(e) => setName(e.target.value)}
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
							{createOrg.isPending ? "Creating…" : "Create workspace"}
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
			toast.success("Invite sent");
			setEmail("");
			props.onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not send invite");
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="overscroll-contain">
				<DialogHeader>
					<DialogTitle>Invite teammate</DialogTitle>
					<DialogDescription>
						They join this workspace after they sign in with that email. Pending
						invites count toward your seat limit.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="invite-email-ws">Email address</Label>
						<Input
							id="invite-email-ws"
							name="inviteEmail"
							type="email"
							autoComplete="email"
							spellCheck={false}
							placeholder="colleague@company.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
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
							{inviteMember.isPending ? "Sending…" : "Send invite"}
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
			toast.success("Workspace name saved");
			void orgDetail.refetch();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not save workspace name",
			);
		}
	};

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	if (!orgDetail.data?.organization) return null;

	return (
		<WorkspaceSection
			icon={<GearIcon className="size-4" aria-hidden="true" />}
			title="Details"
			description="How this workspace is labeled for you and your teammates."
		>
			<form onSubmit={handleUpdate} className="space-y-2">
				<div className="flex items-end gap-3 max-w-lg">
					<div className="flex-1 space-y-2">
						<Label htmlFor="ws-name-input">Workspace name</Label>
						<Input
							id="ws-name-input"
							name="workspaceName"
							placeholder="Acme Corp…"
							autoComplete="organization"
							value={wsName}
							disabled={!canManage}
							onChange={(e) => setWsName(e.target.value)}
						/>
					</div>
					{canManage ? (
						<Button
							type="submit"
							variant="primary"
							disabled={
								updateOrg.isPending ||
								!wsName.trim() ||
								wsName.trim() === orgDetail.data.organization.name
							}
						>
							{updateOrg.isPending ? "Saving…" : "Save name"}
						</Button>
					) : null}
				</div>
				<p className="text-xs text-muted-foreground">
					{canManage
						? "Changing this will update the name for all members."
						: "Only owners and admins can rename this workspace."}
				</p>
			</form>
		</WorkspaceSection>
	);
}

export function WorkspaceSettingsPage() {
	const { activeOrgId, canInviteMembers } = useWorkspaceSettings();
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	return (
		<div className="mx-auto max-w-3xl space-y-8 px-6 py-8 sm:px-8">
			<header className="border-b border-border/80 pb-6">
				<div className="flex items-center justify-between gap-4">
					<h1 className="text-balance text-2xl font-medium tracking-tight text-foreground">
						Workspace
					</h1>
					<div className="flex shrink-0 items-center gap-2">
						{canInviteMembers ? (
							<Button
								type="button"
								variant="primary"
								size="sm"
								className="gap-2 touch-manipulation"
								onClick={() => setIsInviteOpen(true)}
							>
								<UserPlusIcon className="size-4" aria-hidden="true" />
								Invite teammate
							</Button>
						) : null}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2 touch-manipulation"
							onClick={() => setIsCreateOpen(true)}
						>
							<PlusIcon className="size-4" aria-hidden="true" />
							New workspace
						</Button>
					</div>
				</div>
				<p className="mt-3 text-pretty text-sm text-muted-foreground">
					Manage subscriptions, seat allocations, and teammate permissions for
					your corporate environments.
				</p>
			</header>

			{activeOrgId ? (
				<div className="space-y-6">
					<WorkspaceDetailsSection />
					<PayoutFeatureAccessSection />
					<BillingSection />
					<MembersSection onInviteClick={() => setIsInviteOpen(true)} />
				</div>
			) : (
				<div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-border/80 bg-muted/10 p-12 text-center">
					<div className="flex size-14 items-center justify-center rounded-full border border-border/60 bg-background/80">
						<BuildingsIcon
							className="size-7 text-muted-foreground"
							aria-hidden="true"
						/>
					</div>
					<div className="max-w-sm space-y-2">
						<h2 className="text-balance text-base font-medium text-foreground">
							No workspace selected
						</h2>
						<p className="text-pretty text-sm text-muted-foreground">
							Create a workspace or switch to one from the sidebar to manage
							billing and teammates.
						</p>
					</div>
					<Button
						type="button"
						variant="primary"
						className="touch-manipulation"
						onClick={() => setIsCreateOpen(true)}
					>
						Create workspace
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
