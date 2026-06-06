import {
	useLinkOrgWallet,
	useOrganizationGet,
	useUnlinkOrgWallet,
} from "@filosign/react/orgs";
import { WalletIcon } from "@phosphor-icons/react";
import { useState } from "react";
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
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";
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
	const orgDetail = useOrganizationGet(activeOrgId ?? undefined);
	const linkOrgWallet = useLinkOrgWallet();
	const unlinkOrgWallet = useUnlinkOrgWallet();
	const { login, walletAddress } = useThirdweb();

	const [connectDialogOpen, setConnectDialogOpen] = useState(false);
	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";
	const org = orgDetail.data?.organization;
	if (!org) return null;

	const linked = Boolean(org.orgWalletAddress);
	const linkedAtLabel = formatLinkedAt(org.orgWalletLinkedAt);
	const isLinking = linkOrgWallet.isPending;
	const isUnlinking = unlinkOrgWallet.isPending;

	const handleConnectAndSign = async () => {
		if (!activeOrgId) return;
		try {
			await login();
			await linkOrgWallet.mutateAsync(activeOrgId, suppressGlobalErrorToast());
			toast.success("Workspace treasury linked");
			setConnectDialogOpen(false);
		} catch (err) {
			showAppErrorToast(err);
		}
	};

	const handleRemoveTreasury = async () => {
		if (!activeOrgId) return;
		try {
			await unlinkOrgWallet.mutateAsync(
				activeOrgId,
				suppressGlobalErrorToast(),
			);
			toast.success("Workspace treasury removed");
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
				description="Optional payout wallet for team settlements. Distinct from your personal signing wallet — connect the address that will approve USDC payouts on-chain."
			>
				<DocsLink href={DOCS_LINKS.treasuryWallet()} className="mb-4">
					Treasury wallet guide
				</DocsLink>

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

				{canManage ? (
					<div className="mt-4 flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="touch-manipulation"
							disabled={isLinking || isUnlinking || !activeOrgId}
							onClick={() => setConnectDialogOpen(true)}
						>
							{linked ? "Change treasury wallet" : "Connect treasury wallet"}
						</Button>
						{linked ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="touch-manipulation"
								disabled={isLinking || isUnlinking || !activeOrgId}
								onClick={() => setRemoveDialogOpen(true)}
							>
								Remove treasury
							</Button>
						) : null}
					</div>
				) : null}
			</WorkspaceSection>

			<Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
				<DialogContent className="overscroll-contain">
					<DialogHeader>
						<DialogTitle>
							{linked ? "Change treasury wallet" : "Connect treasury wallet"}
						</DialogTitle>
						<DialogDescription>
							Connect the wallet that will pay team settlements — your EOA or an
							external smart wallet (including a Safe via WalletConnect). You
							will sign once to prove control of that address.
						</DialogDescription>
					</DialogHeader>
					{walletAddress ? (
						<p className="text-sm text-muted-foreground">
							Currently connected:{" "}
							<span className="font-mono text-foreground">{walletAddress}</span>
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setConnectDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="primary"
							disabled={isLinking || !activeOrgId}
							onClick={() => void handleConnectAndSign()}
						>
							{isLinking ? "Linking…" : "Choose wallet & sign"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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
