import { MotionReveal } from "@filosign/motion";
import { useFilosignContext } from "@filosign/react";
import { ChartLineIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SettingsSection } from "@/src/lib/components/settings/section";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { ADMIN_NAV_ITEMS } from "@/src/lib/domains/admin/nav";
import { AdminPageHeader } from "@/src/lib/domains/admin/page-header";
import {
	adminPageRoot,
	documentsPageBodyInset,
	documentsTableCard,
} from "@/src/lib/domains/admin/page-layout";

type DashboardStats = {
	pendingAccessRequests: number;
	pendingPayoutAccess: number;
	activeInvites: number;
	feedbackTotal: number;
};

function NeedsAttentionSection({ stats }: { stats: DashboardStats }) {
	const rows: ReactNode[] = [];

	if (stats.pendingAccessRequests > 0) {
		rows.push(
			<li key="access">
				<Link
					to="/admin/access-requests"
					search={{ page: 1, status: "pending" }}
					className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
				>
					<span className="font-medium text-foreground">
						Pending access requests
					</span>
					<Badge variant="secondary">{stats.pendingAccessRequests}</Badge>
				</Link>
			</li>,
		);
	}

	if (stats.pendingPayoutAccess > 0) {
		rows.push(
			<li key="payout">
				<Link
					to="/admin/payout-access"
					search={{ page: 1, status: "pending" }}
					className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
				>
					<span className="font-medium text-foreground">
						Pending payout access
					</span>
					<Badge variant="secondary">{stats.pendingPayoutAccess}</Badge>
				</Link>
			</li>,
		);
	}

	if (stats.activeInvites > 0) {
		rows.push(
			<li key="invites">
				<Link
					to="/admin/invites"
					search={{ page: 1, status: "active" }}
					className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
				>
					<span className="font-medium text-foreground">Active invites</span>
					<Badge variant="secondary">{stats.activeInvites}</Badge>
				</Link>
			</li>,
		);
	}

	if (stats.feedbackTotal > 0) {
		rows.push(
			<li key="feedback">
				<Link
					to="/admin/feedback"
					search={{ page: 1 }}
					className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
				>
					<span className="font-medium text-foreground">
						Feedback submissions
					</span>
					<Badge variant="secondary">{stats.feedbackTotal}</Badge>
				</Link>
			</li>,
		);
	}

	if (rows.length === 0) return null;

	return (
		<MotionReveal preset="smooth" delay={0.15} onlyOnce>
			<div className="space-y-3">
				<h2 className="text-sm font-medium text-foreground">Needs attention</h2>
				<div className={documentsTableCard}>
					<ul className="divide-y divide-border/50">{rows}</ul>
				</div>
			</div>
		</MotionReveal>
	);
}

export function AdminOverviewPage() {
	const { rpcQuery } = useFilosignContext();

	const statsQuery = useQuery({
		...rpcQuery.platformAdmin.dashboardStats.queryOptions(),
	});

	const metricsQuery = useQuery({
		...rpcQuery.metrics.invitesSummary.queryOptions({ input: {} }),
	});

	const stats = statsQuery.data;

	return (
		<div className={adminPageRoot}>
			<div className={documentsPageBodyInset}>
				<AdminPageHeader
					title="Overview"
					description="Platform operations at a glance."
					actions={
						<Button
							variant="primary"
							size="sm"
							render={
								<Link to="/admin/invites" search={{ page: 1, status: "all" }} />
							}
						>
							Create invite
						</Button>
					}
				/>

				<div className="mt-6 space-y-8">
					{statsQuery.isPending ? (
						<p className="text-sm text-muted-foreground">Loading stats…</p>
					) : stats ? (
						<NeedsAttentionSection stats={stats} />
					) : null}

					{metricsQuery.data ? (
						<MotionReveal preset="smooth" delay={0.2} onlyOnce>
							<SettingsSection
								icon={<ChartLineIcon className="size-4" aria-hidden />}
								title="Cold invite funnel"
								description="Lifecycle counts for platform invite outreach."
							>
								<dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
									{(
										[
											["Sent", metricsQuery.data.sent],
											["Claimed", metricsQuery.data.claimed],
											["Pending", metricsQuery.data.pending],
											["Expired", metricsQuery.data.expired],
											["Revoked", metricsQuery.data.revoked],
										] as const
									).map(([label, value]) => (
										<div key={label}>
											<dt className="text-xs text-muted-foreground">{label}</dt>
											<dd className="text-base font-medium tabular-nums text-foreground">
												{value}
											</dd>
										</div>
									))}
								</dl>
							</SettingsSection>
						</MotionReveal>
					) : null}

					<MotionReveal preset="smooth" delay={0.25} onlyOnce>
						<div className="space-y-3">
							<h2 className="text-sm font-medium text-foreground">
								Quick links
							</h2>
							<div className={documentsTableCard}>
								<ul className="divide-y divide-border/50">
									{ADMIN_NAV_ITEMS.filter((item) => item.url !== "/admin/").map(
										(item) => {
											const path = item.url.replace(/\/$/, "");
											const linkClassName =
												"flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/30";

											if (path === "/admin/invites") {
												return (
													<li key={item.url}>
														<Link
															to="/admin/invites"
															search={{ page: 1, status: "all" }}
															className={linkClassName}
														>
															<span className="font-medium text-foreground">
																{item.title}
															</span>
															<span className="text-muted-foreground">
																{item.description}
															</span>
														</Link>
													</li>
												);
											}

											if (path === "/admin/access-requests") {
												return (
													<li key={item.url}>
														<Link
															to="/admin/access-requests"
															search={{ page: 1, status: "pending" }}
															className={linkClassName}
														>
															<span className="font-medium text-foreground">
																{item.title}
															</span>
															<span className="text-muted-foreground">
																{item.description}
															</span>
														</Link>
													</li>
												);
											}

											if (path === "/admin/payout-access") {
												return (
													<li key={item.url}>
														<Link
															to="/admin/payout-access"
															search={{ page: 1, status: "pending" }}
															className={linkClassName}
														>
															<span className="font-medium text-foreground">
																{item.title}
															</span>
															<span className="text-muted-foreground">
																{item.description}
															</span>
														</Link>
													</li>
												);
											}

											if (path === "/admin/users") {
												return (
													<li key={item.url}>
														<Link
															to="/admin/users"
															search={{ page: 1 }}
															className={linkClassName}
														>
															<span className="font-medium text-foreground">
																{item.title}
															</span>
															<span className="text-muted-foreground">
																{item.description}
															</span>
														</Link>
													</li>
												);
											}

											if (path === "/admin/feedback") {
												return (
													<li key={item.url}>
														<Link
															to="/admin/feedback"
															search={{ page: 1 }}
															className={linkClassName}
														>
															<span className="font-medium text-foreground">
																{item.title}
															</span>
															<span className="text-muted-foreground">
																{item.description}
															</span>
														</Link>
													</li>
												);
											}

											return (
												<li key={item.url}>
													<Link
														to={
															path as
																| "/admin/metrics"
																| "/admin/system-templates"
														}
														className={linkClassName}
													>
														<span className="font-medium text-foreground">
															{item.title}
														</span>
														<span className="text-muted-foreground">
															{item.description}
														</span>
													</Link>
												</li>
											);
										},
									)}
								</ul>
							</div>
						</div>
					</MotionReveal>
				</div>
			</div>
		</div>
	);
}
