import { BuildingsIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { useBillingSettings } from "@/src/lib/domains/billing/use-billing-settings";
import { ArchivalSection } from "./archival-section";
import { BillingSection } from "./subscription/section";

export function BillingSettingsPage() {
	const { activeOrgId } = useBillingSettings();

	return (
		<div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8 sm:px-8">
			<header className="border-b border-border/80 pb-6">
				<h1 className="text-balance text-2xl font-medium tracking-tight text-foreground">
					Billing
				</h1>
				<p className="mt-3 text-pretty text-sm text-muted-foreground">
					Manage your workspace subscription, seats, and archival storage for
					the active workspace.
				</p>
				<DocsLink href={DOCS_LINKS.billingAndSeats()} className="mt-2">
					Billing and seats guide
				</DocsLink>
			</header>

			{activeOrgId ? (
				<div className="space-y-6">
					<BillingSection />
					<ArchivalSection />
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
							Select a workspace
						</h2>
						<p className="text-pretty text-sm text-muted-foreground">
							Solo, Teams, and Teams Pro subscriptions are billed per workspace.
							Switch to a workspace from the sidebar to view or change billing.
						</p>
					</div>
					<Button
						type="button"
						variant="primary"
						render={<Link to="/dashboard/settings/workspace" />}
					>
						Open workspace settings
					</Button>
				</div>
			)}
		</div>
	);
}
