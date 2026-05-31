import { getPlanName, PLAN_PRICING } from "@filosign/entitlements";
import { useActiveOrgId } from "@filosign/react/orgs";
import { CreditCardIcon, SparkleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import env from "@/src/env";
import { ProfileSection } from "./profile-section";

function pricingHref(): string {
	return `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;
}

export function ProfileBillingSection() {
	const activeOrgId = useActiveOrgId();
	const [interval] = useState<"monthly" | "yearly">("monthly");

	return (
		<ProfileSection
			icon={<CreditCardIcon className="size-4" aria-hidden="true" />}
			title="Billing & Plans"
			description="Solo, Teams, and Teams Pro are billed per workspace. Manage your subscription in workspace settings."
		>
			<div className="space-y-6">
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="text-pretty text-sm text-muted-foreground">
						Your workspace subscription controls plan features and quotas.
						Profile settings no longer host a separate wallet subscription.
					</p>
					{activeOrgId ? (
						<Link
							to="/dashboard/settings/workspace"
							className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
						>
							Open workspace billing
						</Link>
					) : (
						<p className="mt-3 text-xs text-muted-foreground">
							Select or create a workspace from the sidebar to manage billing.
						</p>
					)}
				</div>

				<div className="space-y-3">
					<h3 className="text-sm font-medium text-foreground">
						Need collaboration?
					</h3>
					<p className="text-pretty text-sm text-muted-foreground">
						Teams and Teams Pro add shared templates, settlements, and per-seat
						quotas for your workspace.
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						{(["teams", "teams_pro"] as const).map((planId) => (
							<div
								key={planId}
								className="rounded-xl border border-border/60 bg-muted/10 p-4"
							>
								<div className="flex items-center gap-1.5">
									<span className="text-sm font-semibold text-foreground">
										{getPlanName(planId)}
									</span>
									{planId === "teams_pro" ? (
										<SparkleIcon
											className="size-3.5 text-warning"
											weight="fill"
											aria-hidden
										/>
									) : null}
								</div>
								<p className="mt-1 text-xs text-muted-foreground">
									{planId === "teams"
										? "Templates and team visibility."
										: "Advanced routing and settlements."}
								</p>
								<p className="mt-2 text-sm font-bold tabular-nums">
									$
									{interval === "yearly"
										? PLAN_PRICING[planId].yearly
										: PLAN_PRICING[planId].monthly}
									/mo per seat
								</p>
							</div>
						))}
					</div>
					<a
						href={pricingHref()}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
					>
						Compare all plans
					</a>
				</div>
			</div>
		</ProfileSection>
	);
}
