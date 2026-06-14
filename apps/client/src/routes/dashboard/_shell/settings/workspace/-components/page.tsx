import { useEntitlements } from "@filosign/react/billing";
import { canUseTeamCollaboration } from "@filosign/react/files";
import {
	BuildingsIcon,
	GearIcon,
	PlusIcon,
	UserPlusIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import {
	CreateWorkspaceFlow,
	InviteTeammateDialog,
	useCreateWorkspacePendingFromUrl,
} from "@/src/routes/dashboard/_shell/-components/workspace-dialogs";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { MembersSection } from "./members-section";
import { OrgWalletSection } from "./org-wallet-section";
import { PayoutFeatureAccessSection } from "./payout/feature-access-section";
import { WorkspacePlanSummary } from "./workspace-plan-summary";
import { WorkspaceSection } from "./workspace-section";

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
			await updateOrg.mutateAsync(
				{ name: wsName.trim() },
				suppressGlobalErrorToast(),
			);
			toastUser.success(TOASTS.workspace.nameSaved);
			void orgDetail.refetch();
		} catch (err) {
			showAppErrorToast(err);
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

			<div className="mt-6 border-t border-border/60 pt-6">
				<WorkspacePlanSummary canManageBilling={canManage} />
			</div>
		</WorkspaceSection>
	);
}

export function WorkspaceSettingsPage() {
	const { activeOrgId, canInviteMembers } = useWorkspaceSettings();
	const { data: entitlements } = useEntitlements();
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [upgradeOpen, setUpgradeOpen] = useState(false);
	const { pendingBillingId: pendingFromCheckout } =
		useCreateWorkspacePendingFromUrl();

	useEffect(() => {
		if (pendingFromCheckout) setIsCreateOpen(true);
	}, [pendingFromCheckout]);

	const hasCollaboration = canUseTeamCollaboration(entitlements);

	const handleInviteClick = () => {
		if (hasCollaboration) {
			setIsInviteOpen(true);
		} else {
			setUpgradeOpen(true);
		}
	};

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
								variant="outline"
								size="sm"
								className="gap-2 touch-manipulation"
								onClick={handleInviteClick}
							>
								<UserPlusIcon className="size-4" aria-hidden="true" />
								Invite teammate
								<ProFeatureMark size="xs" />
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
					Manage workspace details, teammates, treasury, and payout access for
					the active workspace.
				</p>
				<DocsLink href={DOCS_LINKS.workspace()} className="mt-2">
					Workspace guides
				</DocsLink>
			</header>

			{activeOrgId ? (
				<div className="space-y-6">
					<WorkspaceDetailsSection />
					<OrgWalletSection />
					<MembersSection onInviteClick={handleInviteClick} />
					<PayoutFeatureAccessSection />
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
							teammates and workspace settings.
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
			<CreateWorkspaceFlow open={isCreateOpen} onOpenChange={setIsCreateOpen} />
			<UpgradePlanDialog
				open={upgradeOpen}
				onOpenChange={setUpgradeOpen}
				reason="features.team_collaboration"
			/>
		</div>
	);
}
