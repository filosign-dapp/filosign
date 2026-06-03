import {
	useArchivalProducts,
	useOrgArchivalStatus,
	usePurchaseOrgArchival,
} from "@filosign/react/archival";
import { HardDrivesIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection } from "./workspace-section";

export function ArchivalSection() {
	const { activeMembership } = useWorkspaceSettings();
	const products = useArchivalProducts();
	const status = useOrgArchivalStatus();
	const purchase = usePurchaseOrgArchival();

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	if (!canManage) return null;

	const returnUrl = `${window.location.origin}/dashboard/settings/workspace`;

	const startPurchase = async (productId: string) => {
		try {
			const result = await purchase.mutateAsync({ productId, returnUrl });
			window.location.href = result.checkoutUrl;
		} catch {
			// toast via mutation default
		}
	};

	return (
		<WorkspaceSection
			icon={<HardDrivesIcon className="size-4" aria-hidden="true" />}
			title="Filecoin archival"
			description="Org-wide retention on Filecoin for all signed documents in this workspace."
		>
			{status.isLoading ? (
				<p className="text-sm text-muted-foreground">
					Loading archival status…
				</p>
			) : status.data?.active ? (
				<div className="space-y-2 rounded-lg border border-border bg-muted/10 px-4 py-3 text-sm">
					<p>
						Retention active until{" "}
						{status.data.retentionUntil
							? new Date(status.data.retentionUntil).toLocaleDateString()
							: "—"}
						{status.data.productId ? ` (${status.data.productId})` : null}
					</p>
					<p className="text-xs text-muted-foreground">
						Manage renewal or cancellation from your Dodo customer portal when
						subscribed yearly.
					</p>
				</div>
			) : status.data?.exportGraceUntil ? (
				<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
					Export window ends{" "}
					{new Date(status.data.exportGraceUntil).toLocaleDateString()}.
					Resubscribe to keep Filecoin copies.
				</div>
			) : (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Requires a paid workspace plan. One price per organization (not per
						seat or envelope).
					</p>
					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						{(products.data?.products ?? []).map((product) => (
							<Button
								key={product.productId}
								type="button"
								variant="outline"
								size="sm"
								disabled={purchase.isPending}
								onClick={() => void startPurchase(product.productId)}
							>
								{product.label} — ${product.amountUsd}
							</Button>
						))}
					</div>
				</div>
			)}
		</WorkspaceSection>
	);
}
