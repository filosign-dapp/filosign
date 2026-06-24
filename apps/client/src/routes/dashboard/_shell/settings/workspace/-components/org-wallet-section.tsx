import { useEntitlements } from "@filosign/react/billing";
import { canUseWorkspaceTreasury } from "@filosign/react/files";
import { useOrganizationGet, useUnlinkOrgWallet } from "@filosign/react/orgs";
import { WalletIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useTreasuryOrgLink } from "@/src/lib/web3/treasury";
import { TreasurySafePendingPanel } from "@/src/routes/dashboard/_shell/settings/workspace/-components/treasury-safe-pending-panel";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection } from "./workspace-section";

function formatLinkedAt(value: string | Date | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function OrgWalletSection() {
	const { activeOrgId, activeMembership } = useWorkspaceSettings();
	const { data: entitlements } = useEntitlements();
	const orgDetail = useOrganizationGet(activeOrgId ?? undefined);
	const unlinkOrgWallet = useUnlinkOrgWallet();
	const { linkTreasury, isLinking, isPollingSafe, pendingSafeAddress } =
		useTreasuryOrgLink();

	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
	const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";
	const org = orgDetail.data?.organization;
	if (!org) return null;
	const canUseTreasury = canUseWorkspaceTreasury(entitlements);

	const linked = Boolean(org.orgWalletAddress);
	const linkedAtLabel = formatLinkedAt(org.orgWalletLinkedAt);
	const isUnlinking = unlinkOrgWallet.isPending;

	const handleConnectAndSign = async () => {
		if (!activeOrgId) return;
		try {
			await linkTreasury({ organizationId: activeOrgId });
			toastUser.success(TOASTS.workspace.treasuryLinked);
		} catch {
			// useTreasuryOrgLink already surfaces errors via toast.
		}
	};

	const handleRemoveTreasury = async () => {
		if (!activeOrgId) return;
		try {
			await unlinkOrgWallet.mutateAsync(
				activeOrgId,
				suppressGlobalErrorToast(),
			);
			toastUser.success(TOASTS.workspace.treasuryRemoved);
			setRemoveDialogOpen(false);
		} catch (err) {
			showAppErrorToast(err);
		}
	};

	return (
		<>
			<WorkspaceSection
				icon={<WalletIcon className="size-4" aria-hidden="true" />}
				title="Workspace treasury"
				description="Optional payout wallet for team settlements. Distinct from your personal signing wallet - connect the address that will approve USDC payouts on-chain."
			>
				<DocsLink href={DOCS_LINKS.treasuryWallet()} className="mb-4">
					Treasury wallet guide
				</DocsLink>

				{canUseTreasury && isPollingSafe ? (
					<TreasurySafePendingPanel safeAddress={pendingSafeAddress} />
				) : null}

				{linked ? (
					<div className="space-y-2">
						<p className="font-mono text-sm text-foreground break-all">
							{org.orgWalletAddress}
						</p>
						{linkedAtLabel ? (
							<p className="text-xs text-muted-foreground">
								Linked {linkedAtLabel}
							</p>
						) : null}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No treasury wallet linked. New workspaces default to the creator
						wallet; you can connect a different external wallet for payouts.
					</p>
				)}

				{!canUseTreasury ? (
					<div className="mt-4 space-y-3">
						<p className="text-sm text-muted-foreground">
							Custom workspace treasury is available on Teams Pro or Enterprise.
							Solo and Teams can attach payouts from your account.
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => setUpgradeDialogOpen(true)}
						>
							Upgrade to Teams Pro
							<ProFeatureMark size="xs" />
						</Button>
					</div>
				) : canManage ? (
					<div className="mt-4 flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="touch-manipulation"
							disabled={
								isLinking || isPollingSafe || isUnlinking || !activeOrgId
							}
							onClick={() => void handleConnectAndSign()}
						>
							{isLinking
								? "Linking…"
								: linked
									? "Change treasury wallet"
									: "Connect treasury wallet"}
						</Button>
						{linked ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="touch-manipulation"
								disabled={
									isLinking || isPollingSafe || isUnlinking || !activeOrgId
								}
								onClick={() => setRemoveDialogOpen(true)}
							>
								Remove treasury
							</Button>
						) : null}
					</div>
				) : null}
			</WorkspaceSection>
			<UpgradePlanDialog
				open={upgradeDialogOpen}
				onOpenChange={setUpgradeDialogOpen}
				reason="features.treasury.workspace_custom"
			/>

			<Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
				<DialogContent className="overscroll-contain">
					<DialogHeader>
						<DialogTitle>Remove treasury wallet?</DialogTitle>
						<DialogDescription>
							Payout rules that reference this treasury will no longer work
							until you connect a new payout wallet.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setRemoveDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={isUnlinking || !activeOrgId}
							onClick={() => void handleRemoveTreasury()}
						>
							{isUnlinking ? "Removing…" : "Remove treasury"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
