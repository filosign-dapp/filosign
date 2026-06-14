import { getPlanName, type PlanId } from "@filosign/entitlements";
import { MotionReveal } from "@filosign/motion";
import { useFilosignContext } from "@filosign/react";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { platformInviteEmailVariants } from "@filosign/shared";
import {
	ArrowLeftIcon,
	CurrencyCircleDollarIcon,
	PaperPlaneIcon,
	ShieldCheckIcon,
	TicketIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { z } from "zod";
import env from "@/src/env";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { AdminSectionEmpty } from "@/src/lib/components/app/empty-state";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { formatInlineAppError } from "@/src/lib/errors";
import { cn } from "@/src/lib/utils/index";
import { AdminFeedbackSection } from "@/src/routes/dashboard/_shell/admin/-components/admin-feedback-section";
import { AdminMetricsSection } from "@/src/routes/dashboard/_shell/admin/-components/admin-metrics-section";

type AdminInviteRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["invites"]["list"]["invites"][number];
type InviteEmailVariant = AdminInviteRow["emailVariant"];

const INVITE_EMAIL_VARIANT_LABELS: Record<InviteEmailVariant, string> = {
	warm: "Variant 1 — warm (already talked)",
	cold: "Variant 2 — cold outreach",
	custom: "Custom message",
};
type AdminUserRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["users"]["list"]["users"][number];
type AdminAccessRequestRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["accessRequests"]["list"]["requests"][number];
type AdminSettlementAccessRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["settlementFeatureAccess"]["list"]["requests"][number];

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
	const [partnerName, setPartnerName] = useState("");
	const [inviteEmailBody, setInviteEmailBody] = useState("");
	const [inviteEmailVariant, setInviteEmailVariant] =
		useState<InviteEmailVariant>("warm");
	const [recipientEmail, setRecipientEmail] = useState("");
	const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
	const [pendingInvite, setPendingInvite] = useState<{
		id: string;
		email: string;
		partnerName: string | null;
	} | null>(null);
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

	const settlementAccessQuery = useQuery({
		...rpcQuery.platformAdmin.settlementFeatureAccess.list.queryOptions(),
		retry: false,
		enabled: isAdmin,
	});

	const createInvite = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: (input: {
			email: string;
			partnerName: string;
			emailVariant: InviteEmailVariant;
			emailBody?: string;
		}) =>
			rpc.platformAdmin.invites.create({
				kind: "partner_trial",
				planId: "teams_pro",
				trialDays: 30,
				email: input.email,
				note: input.partnerName,
				emailVariant: input.emailVariant,
				emailBody: input.emailBody || undefined,
			}),
		onSuccess: (data) => {
			const url = new URL("/", env.VITE_CLIENT_URL);
			url.searchParams.set("platformInvite", data.token as string);
			setLastInviteUrl(url.toString());
			if (data.email) {
				setPendingInvite({
					id: data.id,
					email: data.email,
					partnerName: data.note,
				});
				const label = data.note ? `${data.note} (${data.email})` : data.email;
				toastUser.success(TOASTS.admin.inviteCreated(label));
			}
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.invites.list.queryKey(),
			});
			setRecipientEmail("");
			setPartnerName("");
			setInviteEmailBody("");
			setInviteEmailVariant("warm");
		},
		onError: (err) => {
			setError(formatInlineAppError(err));
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

	const sendInviteEmail = useMutation({
		mutationFn: (inviteId: string) =>
			rpc.platformAdmin.invites.send({ inviteId }),
		onSuccess: (data, inviteId) => {
			if (data.emailSent && data.email) {
				toastUser.success(TOASTS.admin.inviteSent(data.email));
			} else if (data.email) {
				const readyCopy = TOASTS.admin.inviteReadyNoEmail(data.email);
				toastUser.success(readyCopy.title, { hint: readyCopy.hint });
			}
			if (pendingInvite?.id === inviteId) {
				setPendingInvite(null);
			}
		},
	});

	const rebookInvite = useMutation({
		mutationFn: (args: {
			inviteId: string;
			email?: string | null;
			partnerName?: string | null;
		}) => rpc.platformAdmin.invites.rebook({ inviteId: args.inviteId }),
		onSuccess: (data, variables) => {
			const url = new URL("/", env.VITE_CLIENT_URL);
			url.searchParams.set("platformInvite", data.token as string);
			setLastInviteUrl(url.toString());
			if (variables.email) {
				setPendingInvite({
					id: data.id,
					email: variables.email,
					partnerName: variables.partnerName ?? null,
				});
				const label = variables.partnerName
					? `${variables.partnerName} (${variables.email})`
					: variables.email;
				toastUser.success(TOASTS.admin.inviteReissued(label));
			} else {
				toastUser.success(TOASTS.admin.inviteReissuedGeneric);
			}
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

	const approveSettlementAccess = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: (organizationId: string) =>
			rpc.platformAdmin.settlementFeatureAccess.approve({
				organizationId,
				reviewNote: note || undefined,
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey:
					rpcQuery.platformAdmin.settlementFeatureAccess.list.queryKey(),
			});
			setNote("");
		},
		onError: (err) => {
			setError(formatInlineAppError(err));
		},
	});

	const rejectSettlementAccess = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: (organizationId: string) =>
			rpc.platformAdmin.settlementFeatureAccess.reject({
				organizationId,
				reviewNote: note || undefined,
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey:
					rpcQuery.platformAdmin.settlementFeatureAccess.list.queryKey(),
			});
			setNote("");
		},
		onError: (err) => {
			setError(formatInlineAppError(err));
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
				wallet: args.walletAddress,
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

	const invites: AdminInviteRow[] = invitesQuery.data?.invites ?? [];
	const users: AdminUserRow[] = usersQuery.data?.users ?? [];
	const accessRequests: AdminAccessRequestRow[] =
		accessRequestsQuery.data?.requests ?? [];
	const settlementAccessRequests: AdminSettlementAccessRow[] =
		settlementAccessQuery.data?.requests ?? [];

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
					description="Create a design partner trial invite, then send the email when ready."
				>
					<div className="space-y-4">
						<div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
							<div className="space-y-1.5">
								<span className="text-xs font-normal text-muted-foreground block">
									Partner name
								</span>
								<Input
									placeholder="Jordan Lee"
									value={partnerName}
									onChange={(e) => setPartnerName(e.target.value)}
									autoComplete="name"
									disabled={createInvite.isPending}
								/>
							</div>
							<div className="space-y-1.5">
								<span className="text-xs font-normal text-muted-foreground block">
									Recipient email
								</span>
								<Input
									type="email"
									placeholder="partner@acme.com"
									value={recipientEmail}
									onChange={(e) => setRecipientEmail(e.target.value)}
									autoComplete="email"
									disabled={createInvite.isPending}
								/>
							</div>
						</div>

						<div className="space-y-1.5 max-w-2xl">
							<span className="text-xs font-normal text-muted-foreground block">
								Email variant
							</span>
							<Select
								value={inviteEmailVariant}
								onValueChange={(value) =>
									setInviteEmailVariant(value as InviteEmailVariant)
								}
								disabled={createInvite.isPending}
							>
								<SelectTrigger className="w-full sm:max-w-md">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{platformInviteEmailVariants.map((variant) => (
										<SelectItem key={variant} value={variant}>
											{INVITE_EMAIL_VARIANT_LABELS[variant]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground text-pretty">
								Warm for people you have already spoken with. Cold for
								unsolicited outreach. Custom lets you write the main paragraph.
							</p>
						</div>

						{inviteEmailVariant === "custom" ? (
							<div className="space-y-1.5 max-w-2xl">
								<span className="text-xs font-normal text-muted-foreground block">
									Custom message
								</span>
								<Textarea
									placeholder="I am excited to help you set up your first real workflow..."
									value={inviteEmailBody}
									onChange={(e) => setInviteEmailBody(e.target.value)}
									rows={4}
									disabled={createInvite.isPending}
									className="resize-y min-h-[96px]"
								/>
								<p className="text-xs text-muted-foreground text-pretty">
									Replaces the default middle paragraph in the email body.
								</p>
							</div>
						) : null}

						{error && (
							<p className="text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded-md p-2">
								{error}
							</p>
						)}

						<Button
							type="button"
							variant="primary"
							size="sm"
							className="touch-manipulation"
							onClick={() => {
								setError(null);
								const email = recipientEmail.trim();
								const name = partnerName.trim();
								if (!name) {
									setError("Enter the partner's name.");
									return;
								}
								if (!z.email().safeParse(email).success) {
									setError("Enter a valid recipient email.");
									return;
								}
								if (
									inviteEmailVariant === "custom" &&
									!inviteEmailBody.trim()
								) {
									setError(
										"Enter a custom message for the custom email variant.",
									);
									return;
								}
								createInvite.mutate({
									email,
									partnerName: name,
									emailVariant: inviteEmailVariant,
									emailBody:
										inviteEmailVariant === "custom"
											? inviteEmailBody.trim()
											: undefined,
								});
							}}
							isLoading={createInvite.isPending}
						>
							Create invite
						</Button>

						{lastInviteUrl && (
							<div className="text-xs rounded-md border border-border/40 bg-muted/10 p-3 space-y-3">
								<div className="space-y-1">
									<span className="font-medium text-foreground">
										Invite link
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
								{pendingInvite ? (
									<div className="flex flex-wrap items-center gap-2 border-t border-border/30 pt-3">
										<p className="text-muted-foreground">
											Step 2: send the design partner email to{" "}
											<span className="font-medium text-foreground">
												{pendingInvite.partnerName
													? `${pendingInvite.partnerName} (${pendingInvite.email})`
													: pendingInvite.email}
											</span>
										</p>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											className="touch-manipulation"
											onClick={() => sendInviteEmail.mutate(pendingInvite.id)}
											isLoading={sendInviteEmail.isPending}
										>
											Send email
										</Button>
									</div>
								) : null}
							</div>
						)}
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
						<AdminSectionEmpty title="No invites created yet." />
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
											<div className="min-w-0">
												<span className="font-semibold text-foreground block truncate">
													{invite.note
														? String(invite.note)
														: invite.email
															? String(invite.email)
															: id}
												</span>
												{invite.note && invite.email ? (
													<span className="text-xs text-muted-foreground block truncate">
														{String(invite.email)}
													</span>
												) : null}
											</div>
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
												· Email:{" "}
												<span className="font-medium text-foreground">
													{INVITE_EMAIL_VARIANT_LABELS[
														invite.emailVariant as InviteEmailVariant
													] ?? invite.emailVariant}
												</span>{" "}
												· Redemptions:{" "}
												<span className="font-medium text-foreground">
													{String(invite.redemptionCount)}/
													{String(invite.maxRedemptions)}
												</span>
											</span>
											<div className="flex flex-wrap gap-2">
												{invite.email && !isRevoked ? (
													<Button
														size="sm"
														variant="primary"
														onClick={() => sendInviteEmail.mutate(id)}
														isLoading={
															sendInviteEmail.isPending &&
															sendInviteEmail.variables === id
														}
													>
														Send email
													</Button>
												) : null}
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
													onClick={() =>
														rebookInvite.mutate({
															inviteId: id,
															email: invite.email,
															partnerName: invite.note,
														})
													}
													isLoading={
														rebookInvite.isPending &&
														rebookInvite.variables?.inviteId === id
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
						<AdminSectionEmpty title="No requests received yet." />
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
												<Badge variant="secondary">Approved</Badge>
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
											<div className="flex gap-2 pt-1 border-t border-border/30">
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

				<AdminSection
					icon={
						<CurrencyCircleDollarIcon className="size-4" aria-hidden="true" />
					}
					title="Payout attachment requests"
					description="Approve workspace access for programmatic USDC payout attachment (Settlement Feature Addendum on file)."
				>
					{settlementAccessQuery.isPending ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : settlementAccessRequests.length === 0 ? (
						<AdminSectionEmpty title="No workspace payout requests yet." />
					) : (
						<ul className="space-y-3">
							{settlementAccessRequests.map((row) => {
								const organizationId = String(row.organizationId ?? "");
								const status = String(row.status ?? "none");
								return (
									<li
										key={organizationId}
										className="rounded-lg border border-border/60 bg-muted/5 p-4 text-sm space-y-3"
									>
										<div className="flex items-center justify-between gap-4">
											<span className="font-semibold text-foreground">
												{String(row.organizationName ?? organizationId)}
											</span>
											<Badge variant="secondary" className="capitalize">
												{status}
											</Badge>
										</div>
										{row.useCase ? (
											<p className="text-xs text-muted-foreground whitespace-pre-wrap border border-border/40 bg-muted/10 p-2.5 rounded-md">
												{String(row.useCase)}
											</p>
										) : null}
										<p className="text-xs text-muted-foreground">
											Accepted by{" "}
											<span className="font-mono text-foreground">
												{String(row.acceptedByWallet ?? "–")}
											</span>
											· terms {String(row.termsVersion ?? "–")}
										</p>
										{status === "pending" ? (
											<div className="flex gap-2 pt-1 border-t border-border/30 pt-3">
												<Button
													size="sm"
													variant="primary"
													onClick={() =>
														approveSettlementAccess.mutate(organizationId)
													}
													isLoading={
														approveSettlementAccess.isPending &&
														approveSettlementAccess.variables === organizationId
													}
												>
													Approve
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														rejectSettlementAccess.mutate(organizationId)
													}
													isLoading={
														rejectSettlementAccess.isPending &&
														rejectSettlementAccess.variables === organizationId
													}
												>
													Reject
												</Button>
											</div>
										) : row.reviewNote ? (
											<p className="text-xs text-muted-foreground italic">
												Review note: {String(row.reviewNote)}
											</p>
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
						<AdminSectionEmpty title="No users registered." />
					) : (
						<ul className="divide-y divide-border/50">
							{users.map((user) => {
								const wallet = String(user.walletAddress);
								const overrides = user.featureOverrides;
								const settlementOn =
									overrides["features.settlement.basic"] !== false;
								return (
									<li
										key={wallet}
										className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
									>
										<div className="min-w-0 space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-medium text-foreground truncate max-w-50 md:max-w-none">
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
												<span className="truncate max-w-55 sm:max-w-none">
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

			<MotionReveal delay={0.08}>
				<AdminFeedbackSection enabled={isAdmin} />
			</MotionReveal>

			<MotionReveal delay={0.08}>
				<AdminMetricsSection enabled={isAdmin} />
			</MotionReveal>
		</div>
	);
}
