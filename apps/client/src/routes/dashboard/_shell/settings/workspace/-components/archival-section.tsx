import {
	useArchivalProducts,
	useOrgArchivalStatus,
	usePurchaseOrgArchival,
} from "@filosign/react/archival";
import { ArrowSquareOutIcon, HardDrivesIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Label } from "@/src/lib/components/ui/label";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { cn } from "@/src/lib/utils/index";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection } from "./workspace-section";

type ArchivalProduct = {
	productId: string;
	termYears: number;
	amountUsd: number;
	label: string;
	billingModel: "subscription" | "one_time";
};

function archivalPlanTitle(termYears: number): string {
	return termYears === 1 ? "Yearly" : `Every ${termYears} years`;
}

function archivalPlanDescription(productId: string): string {
	switch (productId) {
		case "archival_year":
			return "Renews annually. Best when you want flexibility without a long commitment.";
		case "archival_bundle_3y":
			return "Three-year retention with auto-renew. Lower effective yearly cost than monthly billing.";
		case "archival_bundle_5y":
			return "Five-year horizon for compliance-heavy teams. Lowest effective yearly cost.";
		default:
			return "Org-wide Filecoin retention for all signed documents in this workspace.";
	}
}

function archivalBillingCadence(termYears: number): string {
	return termYears === 1
		? "Billed annually"
		: `Billed every ${termYears} years`;
}

function archivalPriceSuffix(termYears: number): string {
	return termYears === 1 ? "/yr" : `/${termYears}yr`;
}

function effectiveYearlyUsd(
	amountUsd: number,
	termYears: number,
): number | null {
	if (termYears <= 1) return null;
	return Math.round(amountUsd / termYears);
}

function ArchivalActiveSummary(props: {
	productId: string | null;
	retentionUntil: string | null;
}) {
	const products = useArchivalProducts();
	const planMeta = useMemo(() => {
		const match = products.data?.products.find(
			(product) => product.productId === props.productId,
		);
		if (!match) {
			return {
				title: props.productId ? "Filecoin retention" : "Filecoin retention",
				priceLabel: null,
			};
		}
		return {
			title: archivalPlanTitle(match.termYears),
			priceLabel: `$${match.amountUsd}${archivalPriceSuffix(match.termYears)}`,
		};
	}, [products.data?.products, props.productId]);

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="rounded-xl border border-border bg-card p-4">
				<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
					Current plan
				</span>
				<div className="mt-1 flex flex-wrap items-center gap-2">
					<span className="text-lg font-medium text-foreground">
						{planMeta.title}
					</span>
					<Badge variant="secondary">Active</Badge>
				</div>
				{planMeta.priceLabel ? (
					<p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
						{planMeta.priceLabel}
					</p>
				) : null}
			</div>

			<div className="rounded-xl border border-border bg-card p-4">
				<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
					Retention until
				</span>
				<p className="mt-1 text-lg font-medium text-foreground">
					{props.retentionUntil
						? new Date(props.retentionUntil).toLocaleDateString()
						: "—"}
				</p>
				<p className="mt-2 text-xs text-muted-foreground">
					All signed documents in this workspace stay on Filecoin through this
					date.
				</p>
			</div>
		</div>
	);
}

function ArchivalPlanPicker(props: {
	products: ArchivalProduct[];
	selectedProductId: string;
	onSelect: (productId: string) => void;
	onPurchase: (productId: string) => void;
	isPurchasing: boolean;
}) {
	const selected = props.products.find(
		(product) => product.productId === props.selectedProductId,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<ArrowSquareOutIcon
					className="size-4 text-primary"
					aria-hidden="true"
				/>
				<h3 className="text-sm font-medium text-foreground">
					Choose a retention plan
				</h3>
			</div>

			<div className="space-y-2">
				<Label>Storage plan</Label>
				<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
					{props.products.map((product) => {
						const isSelected = props.selectedProductId === product.productId;
						const effectiveYearly = effectiveYearlyUsd(
							product.amountUsd,
							product.termYears,
						);

						return (
							<button
								key={product.productId}
								type="button"
								className={cn(
									"flex h-full flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all hover:bg-muted/5 cursor-pointer",
									isSelected
										? "border-primary bg-primary/5 ring-1 ring-primary"
										: "border-border/60 bg-card",
								)}
								onClick={() => props.onSelect(product.productId)}
							>
								<div className="flex w-full items-start justify-between gap-2">
									<span className="text-sm font-semibold text-foreground">
										{archivalPlanTitle(product.termYears)}
									</span>
									{product.productId === "archival_bundle_5y" ? (
										<Badge
											variant="secondary"
											className="text-[9px] px-1.5 py-0 h-4 uppercase font-bold tracking-wider"
										>
											Best value
										</Badge>
									) : null}
								</div>

								<p className="text-xs leading-relaxed text-muted-foreground">
									{archivalPlanDescription(product.productId)}
								</p>

								<div className="mt-auto w-full space-y-1 border-t border-border/50 pt-3">
									<p className="text-xl font-bold tabular-nums text-foreground">
										${product.amountUsd}
										<span className="text-sm font-medium text-muted-foreground">
											{archivalPriceSuffix(product.termYears)}
										</span>
									</p>
									<p className="text-xs text-muted-foreground">
										{archivalBillingCadence(product.termYears)}
										{effectiveYearly ? ` · ≈ $${effectiveYearly}/yr` : null}
									</p>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-pretty text-xs text-muted-foreground">
					One flat price per organization — not per seat or envelope. Requires a
					paid workspace plan.
				</p>
				<Button
					type="button"
					variant="primary"
					className="touch-manipulation shrink-0"
					disabled={!selected || props.isPurchasing}
					onClick={() => selected && void props.onPurchase(selected.productId)}
				>
					{props.isPurchasing
						? "Opening checkout…"
						: selected
							? `Subscribe — $${selected.amountUsd}${archivalPriceSuffix(selected.termYears)}`
							: "Subscribe"}
				</Button>
			</div>
		</div>
	);
}

export function ArchivalSection() {
	const { activeMembership } = useWorkspaceSettings();
	const products = useArchivalProducts();
	const status = useOrgArchivalStatus();
	const purchase = usePurchaseOrgArchival();
	const [selectedProductId, setSelectedProductId] = useState<string | null>(
		null,
	);

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const catalog = products.data?.products ?? [];

	useEffect(() => {
		if (catalog.length === 0) return;
		setSelectedProductId((current) => {
			if (current && catalog.some((product) => product.productId === current)) {
				return current;
			}
			return catalog[0]?.productId ?? null;
		});
	}, [catalog]);

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
			title="Archival storage"
			description="Optional yearly plan to keep signed documents in this workspace for 1, 3, or 5 years."
		>
			<DocsLink href={DOCS_LINKS.storageRetention()} className="mb-4">
				Keeping documents long term
			</DocsLink>
			{status.isLoading || products.isLoading ? (
				<p className="text-sm text-muted-foreground">
					Loading archival status…
				</p>
			) : status.data?.active ? (
				<div className="space-y-4">
					<ArchivalActiveSummary
						productId={status.data.productId}
						retentionUntil={status.data.retentionUntil}
					/>
					<p className="text-xs text-muted-foreground">
						Manage renewal or cancellation from your Dodo customer portal.
					</p>
				</div>
			) : status.data?.exportGraceUntil ? (
				<div className="space-y-4">
					<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
						Export window ends{" "}
						{new Date(status.data.exportGraceUntil).toLocaleDateString()}.
						Resubscribe to keep long-term copies.
					</div>
					{selectedProductId ? (
						<ArchivalPlanPicker
							products={catalog}
							selectedProductId={selectedProductId}
							onSelect={setSelectedProductId}
							onPurchase={(productId) => void startPurchase(productId)}
							isPurchasing={purchase.isPending}
						/>
					) : null}
				</div>
			) : catalog.length > 0 && selectedProductId ? (
				<ArchivalPlanPicker
					products={catalog}
					selectedProductId={selectedProductId}
					onSelect={setSelectedProductId}
					onPurchase={(productId) => void startPurchase(productId)}
					isPurchasing={purchase.isPending}
				/>
			) : (
				<p className="text-sm text-muted-foreground">
					Storage plans are unavailable right now. Try again shortly.
				</p>
			)}
		</WorkspaceSection>
	);
}
