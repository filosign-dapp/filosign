import { getPlanName, type PlanId } from "@filosign/entitlements";
import { MotionReveal } from "@filosign/motion";
import { useFilosignContext } from "@filosign/react";
import {
	ArrowLeftIcon,
	PaperPlaneIcon,
	ShieldCheckIcon,
	TicketIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import env from "@/src/env";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { cn } from "@/src/lib/utils/index";

export const Route = createFileRoute("/dashboard/_shell/admin/")({
	component: AdminPage,
});

function AdminSection(props: {
	icon: ReactNode;
	title: string;
	description?: string;
	headerAside?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			className={cn(
				"overflow-hidden rounded-xl border border-border/80 bg-card/40",
				props.className,
			)}
		>
			<div className="border-b border-border/60 bg-muted/15 px-6 py-4">
				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 gap-3">
						<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground">
							{props.icon}
						</div>
						<div className="min-w-0">
							<h2 className="text-base font-medium text-foreground text-balance">
								{props.title}
							</h2>
							{props.description ? (
								<p className="mt-1 text-pretty text-sm text-muted-foreground">
									{props.description}
								</p>
							) : null}
						</div>
					</div>
					{props.headerAside ? (
						<div className="shrink-0">{props.headerAside}</div>
					) : null}
				</div>
			</div>
			<div className="p-6">{props.children}</div>
		</section>
	);
}

function AdminPage() {
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const [note, setNote] = useState("");
	const [emailLock, setEmailLock] = useState("");
	const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const accessQuery = useQuery({
		...rpcQuery.platformAdmin.access.queryOptions(),
		retry: false,
	});

	const isAdmin = accessQuery.data?.isAdmin === true;

	const invitesQuery = useQuery({
		...rpcQuery.platformAdmin.invites.list.queryOptions(),
		retry: false,
		enabled: isAdmin,
	});

	const usersQuery = useQuery({
		...rpcQuery.platformAdmin.users.list.queryOptions(),
		retry: false,
		enabled: isAdmin,
	});

	const accessRequestsQuery = useQuery({
		...rpcQuery.platformAdmin.accessRequests.list.queryOptions(),
		retry: false,
		enabled: isAdmin,
	});

	const createInvite = useMutation({
		mutationFn: () =>
			rpc.platformAdmin.invites.create({
				kind: "partner_trial",
				planId: "teams_pro",
				trialDays: 30,
				note: note || undefined,
				email: emailLock || undefined,
			}),
		onSuccess: (data) => {
			const url = new URL("/", env.VITE_CLIENT_URL);
			url.searchParams.set("platformInvite", data.token as string);
			setLastInviteUrl(url.toString());
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.invites.list.queryKey(),
			});
			setNote("");
			setEmailLock("");
		},
		onError: (err) => {
			setError(err instanceof Error ? err.message : "Failed to create invite");
		},
	});

	const revokeInvite = useMutation({
		mutationFn: (inviteId: string) =>
			rpc.platformAdmin.invites.revoke({ inviteId }),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.invites.list.queryKey(),
			});
		},
	});

	const rebookInvite = useMutation({
		mutationFn: (inviteId: string) =>
			rpc.platformAdmin.invites.rebook({ inviteId }),
		onSuccess: (data) => {
			const url = new URL("/", env.VITE_CLIENT_URL);
			url.searchParams.set("platformInvite", data.token as string);
			setLastInviteUrl(url.toString());
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.invites.list.queryKey(),
			});
		},
	});

	const approveAccessRequest = useMutation({
		mutationFn: (requestId: string) =>
			rpc.platformAdmin.accessRequests.approve({ requestId }),
		onSuccess: (data) => {
			setLastInviteUrl(String(data.inviteUrl));
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.accessRequests.list.queryKey(),
			});
		},
	});

	const rejectAccessRequest = useMutation({
		mutationFn: (requestId: string) =>
			rpc.platformAdmin.accessRequests.reject({ requestId }),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.accessRequests.list.queryKey(),
			});
		},
	});

	const toggleSettlement = useMutation({
		mutationFn: (args: {
			walletAddress: string;
			enabled: boolean;
			current: Record<string, unknown>;
		}) =>
			rpc.platformAdmin.users.setFeatureOverrides({
				walletAddress: args.walletAddress,
				featureOverrides: {
					...args.current,
					"features.settlement.basic": args.enabled,
				},
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.users.list.queryKey(),
			});
		},
	});

	if (accessQuery.isPending) {
		return (
			<div className="flex min-h-svh items-center justify-center">
				<p className="text-sm text-muted-foreground animate-pulse">
					Checking access…
				</p>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className="mx-auto max-w-md px-6 py-16 text-center space-y-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Access Restricted
					</h1>
					<p className="text-sm text-muted-foreground text-pretty">
						This page is restricted to platform admins. Your account email must
						be listed in the server's <code>PLATFORM_ADMIN_EMAILS</code>{" "}
						configuration or your wallet address must be in{" "}
						<code>ADMIN_WALLETS</code>.
					</p>
				</div>
				<Button variant="outline" size="sm" render={<Link to="/dashboard" />}>
					Back to dashboard
				</Button>
			</div>
		);
	}

	const invites =
		(invitesQuery.data as { invites?: Array<Record<string, unknown>> })
			?.invites ?? [];
	const users =
		(usersQuery.data as { users?: Array<Record<string, unknown>> })?.users ??
		[];
	const accessRequests =
		(
			accessRequestsQuery.data as {
				requests?: Array<Record<string, unknown>>;
			}
		)?.requests ?? [];

	return (
		<div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8 sm:px-8">
			<header className="border-b border-border/80 pb-6">
				<div className="flex items-center justify-between gap-4">
					<h1 className="text-balance text-2xl font-medium tracking-tight text-foreground">
						Platform Admin
					</h1>
					<Button
						variant="outline"
						size="sm"
						className="gap-2 shrink-0 touch-manipulation"
						render={<Link to="/dashboard" />}
					>
						<ArrowLeftIcon className="size-4" />
						Dashboard
					</Button>
				</div>
				<p className="mt-3 text-pretty text-sm text-muted-foreground">
					Manage partner invites, access requests, user accounts, and
					system-wide overrides.
				</p>
			</header>

			<MotionReveal
				preset="soft"
				delay={0.2}
				onlyOnce
				id="admin-dashboard-reveal"
				className="space-y-6 w-full"
			>
				{/* Create Invite */}
				<AdminSection
					icon={<TicketIcon className="size-4" aria-hidden="true" />}
					title="Create Invite"
					description="Issue custom redemption tokens for partner trial environments."
				>
					<div className="space-y-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<span className="text-xs font-normal text-muted-foreground block">
									Internal Note
								</span>
								<Input
									placeholder="Acme DAO..."
									value={note}
									onChange={(e) => setNote(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<span className="text-xs font-normal text-muted-foreground block">
									Email Lock (Optional)
								</span>
								<Input
									type="email"
									placeholder="partner@acme.com"
									value={emailLock}
									onChange={(e) => setEmailLock(e.target.value)}
								/>
							</div>
						</div>

						{error && (
							<p className="text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded-md p-2">
								{error}
							</p>
						)}

						{lastInviteUrl && (
							<div className="text-xs rounded-md border border-border/40 bg-muted/10 p-3 space-y-1">
								<span className="font-medium text-foreground">
									Generated Invite Link:
								</span>
								<div className="flex items-center gap-2 mt-1">
									<p className="break-all font-mono text-muted-foreground flex-1">
										<a
											href={lastInviteUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="underline hover:text-foreground"
										>
											{lastInviteUrl}
										</a>
									</p>
									<CopyButton
										text={lastInviteUrl}
										className="text-muted-foreground hover:text-foreground shrink-0"
									/>
								</div>
							</div>
						)}

						<Button
							type="button"
							variant="primary"
							size="sm"
							className="touch-manipulation"
							onClick={() => {
								setError(null);
								createInvite.mutate();
							}}
							isLoading={createInvite.isPending}
						>
							Create Invite
						</Button>
					</div>
				</AdminSection>

				{/* Active Invites */}
				<AdminSection
					icon={<PaperPlaneIcon className="size-4" aria-hidden="true" />}
					title="Active Invites"
					description="Track onboarding tokens, redemption status, and active partner invitations."
				>
					{invitesQuery.isPending ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : invites.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-border/80 bg-muted/5">
							<p className="text-sm text-muted-foreground">
								No invites created yet.
							</p>
						</div>
					) : (
						<ul className="space-y-3">
							{invites.map((invite) => {
								const id = String(invite.id ?? "");
								const token = String(invite.token ?? "");
								const inviteUrl = `${env.VITE_CLIENT_URL.replace(/\/$/, "")}/?platformInvite=${encodeURIComponent(token)}`;
								const isRevoked = Boolean(invite.revokedAt);
								const isRedeemed =
									invite.redemptionCount === invite.maxRedemptions;

								return (
									<li
										key={id}
										className="rounded-lg border border-border/60 bg-muted/5 p-4 text-sm space-y-3"
									>
										<div className="flex items-center justify-between gap-4">
											<span className="font-semibold text-foreground">
												{String(invite.note ?? id)}
											</span>
											{isRevoked ? (
												<Badge variant="destructive">Revoked</Badge>
											) : isRedeemed ? (
												<Badge variant="outline">Fully Redeemed</Badge>
											) : (
												<Badge variant="secondary">Active</Badge>
											)}
										</div>
										<div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 px-3 h-9 font-mono text-xs text-foreground/80 overflow-hidden">
											<span className="truncate flex-1">{inviteUrl}</span>
											<CopyButton
												text={inviteUrl}
												className="text-muted-foreground hover:text-foreground shrink-0"
											/>
										</div>
										<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border/30 pt-3">
											<span>
												Plan:{" "}
												<span className="font-medium text-foreground">
													{getPlanName(invite.planId as PlanId)}
												</span>{" "}
												· Redemptions:{" "}
												<span className="font-medium text-foreground">
													{String(invite.redemptionCount)}/
													{String(invite.maxRedemptions)}
												</span>
											</span>
											<div className="flex gap-2">
												<Button
													size="sm"
													variant="outline"
													disabled={isRevoked}
													onClick={() => revokeInvite.mutate(id)}
													isLoading={
														revokeInvite.isPending &&
														revokeInvite.variables === id
													}
												>
													Revoke
												</Button>
												<Button
													size="sm"
													variant="secondary"
													onClick={() => rebookInvite.mutate(id)}
													isLoading={
														rebookInvite.isPending &&
														rebookInvite.variables === id
													}
												>
													Reissue
												</Button>
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</AdminSection>

				{/* Access Requests */}
				<AdminSection
					icon={<ShieldCheckIcon className="size-4" aria-hidden="true" />}
					title="Access Requests"
					description="Approve or reject pending access requests from beta signups."
				>
					{accessRequestsQuery.isPending ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : accessRequests.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-border/80 bg-muted/5">
							<p className="text-sm text-muted-foreground">
								No requests received yet.
							</p>
						</div>
					) : (
						<ul className="space-y-3">
							{accessRequests.map((request) => {
								const id = String(request.id ?? "");
								const status = String(request.status ?? "pending");
								return (
									<li
										key={id}
										className="rounded-lg border border-border/60 bg-muted/5 p-4 text-sm space-y-3"
									>
										<div className="flex items-center justify-between gap-4">
											<span className="font-semibold text-foreground">
												{String(request.email ?? id)}
											</span>
											{status === "pending" ? (
												<Badge variant="secondary">Pending</Badge>
											) : status === "approved" ? (
												<Badge
													variant="outline"
													className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
												>
													Approved
												</Badge>
											) : (
												<Badge variant="destructive">Rejected</Badge>
											)}
										</div>
										<div className="text-xs text-muted-foreground">
											Name:{" "}
											<span className="font-medium text-foreground">
												{String(request.name ?? "–")}
											</span>{" "}
											· Company:{" "}
											<span className="font-medium text-foreground">
												{String(request.company ?? "–")}
											</span>
										</div>
										{request.message ? (
											<p className="text-xs text-muted-foreground italic bg-muted/10 border border-border/40 p-2.5 rounded-md whitespace-pre-wrap">
												"{String(request.message)}"
											</p>
										) : null}
										{status === "pending" ? (
											<div className="flex gap-2 pt-1 border-t border-border/30 pt-3">
												<Button
													size="sm"
													variant="primary"
													onClick={() => approveAccessRequest.mutate(id)}
													isLoading={
														approveAccessRequest.isPending &&
														approveAccessRequest.variables === id
													}
												>
													Approve + Invite
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => rejectAccessRequest.mutate(id)}
													isLoading={
														rejectAccessRequest.isPending &&
														rejectAccessRequest.variables === id
													}
												>
													Reject
												</Button>
											</div>
										) : null}
									</li>
								);
							})}
						</ul>
					)}
				</AdminSection>

				{/* Registered Users */}
				<AdminSection
					icon={<UsersIcon className="size-4" aria-hidden="true" />}
					title="Registered Users"
					description="Review database users, subscription plans, and settlement feature overrides."
				>
					{usersQuery.isPending ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : users.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-border/80 bg-muted/5">
							<p className="text-sm text-muted-foreground">
								No users registered.
							</p>
						</div>
					) : (
						<ul className="divide-y divide-border/50">
							{users.map((user) => {
								const wallet = String(user.walletAddress);
								const overrides =
									(user.featureOverrides as Record<string, unknown>) ?? {};
								const settlementOn =
									overrides["features.settlement.basic"] !== false;
								return (
									<li
										key={wallet}
										className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
									>
										<div className="min-w-0 space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-medium text-foreground truncate max-w-[200px] md:max-w-none">
													{String(user.email ?? "–")}
												</span>
												<Badge variant="outline">
													{getPlanName(user.planId as PlanId)}
												</Badge>
												<Badge
													variant="secondary"
													className="capitalize text-[10px] px-1.5 h-4.5"
												>
													{String(user.status)}
												</Badge>
											</div>
											<div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
												<span className="truncate max-w-[220px] sm:max-w-none">
													{wallet}
												</span>
												<CopyButton
													text={wallet}
													className="text-muted-foreground hover:text-foreground shrink-0"
												/>
											</div>
										</div>
										<div className="flex shrink-0 items-center gap-2">
											<Badge
												variant={settlementOn ? "secondary" : "outline"}
												className="h-7 px-2.5"
											>
												Settlement {settlementOn ? "Active" : "Disabled"}
											</Badge>
											<Button
												size="sm"
												variant={settlementOn ? "outline" : "primary"}
												disabled={toggleSettlement.isPending}
												onClick={() =>
													toggleSettlement.mutate({
														walletAddress: wallet,
														enabled: !settlementOn,
														current: overrides,
													})
												}
												isLoading={
													toggleSettlement.isPending &&
													toggleSettlement.variables?.walletAddress === wallet
												}
											>
												{settlementOn ? "Disable" : "Enable"}
											</Button>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</AdminSection>
			</MotionReveal>
		</div>
	);
}
