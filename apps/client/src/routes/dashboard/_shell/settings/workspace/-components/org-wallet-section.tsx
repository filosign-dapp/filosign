import { useLinkOrgWallet, useOrganizationGet } from "@filosign/react/orgs";
import { WalletIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection } from "./workspace-section";

export function OrgWalletSection() {
	const { activeOrgId, activeMembership } = useWorkspaceSettings();
	const orgDetail = useOrganizationGet(activeOrgId ?? undefined);
	const linkOrgWallet = useLinkOrgWallet();

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";
	const org = orgDetail.data?.organization;
	if (!org) return null;

	const linked = Boolean(org.orgWalletAddress);

	return (
		<WorkspaceSection
			icon={<WalletIcon className="size-4" aria-hidden="true" />}
			title="Workspace treasury"
			description="External wallet (often a Safe) used as payer on settlement rules. Must sign payout approvals on-chain."
		>
			<DocsLink href={DOCS_LINKS.treasuryWallet()} className="mb-4">
				Treasury wallet guide
			</DocsLink>
			{linked ? (
				<p className="text-sm text-muted-foreground font-mono break-all">
					{org.orgWalletAddress}
				</p>
			) : (
				<p className="text-sm text-muted-foreground">
					Not linked yet. Owners and admins can link the connected wallet as the
					workspace treasury for team payouts.
				</p>
			)}
			{canManage ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3 touch-manipulation"
					disabled={linkOrgWallet.isPending || !activeOrgId}
					onClick={async () => {
						if (!activeOrgId) return;
						try {
							await linkOrgWallet.mutateAsync(
								activeOrgId,
								suppressGlobalErrorToast(),
							);
							toast.success("Workspace treasury linked");
						} catch (err) {
							showAppErrorToast(err);
						}
					}}
				>
					{linkOrgWallet.isPending
						? "Linking…"
						: linked
							? "Re-link connected wallet"
							: "Link connected wallet"}
				</Button>
			) : null}
		</WorkspaceSection>
	);
}
