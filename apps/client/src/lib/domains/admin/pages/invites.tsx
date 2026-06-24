import { getPlanName, type PlanId } from "@filosign/entitlements";
import { useFilosignContext } from "@filosign/react";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { PlusIcon } from "@phosphor-icons/react";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Fragment, useCallback, useState } from "react";
import env from "@/src/env";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { PageSearchInput } from "@/src/lib/components/app/page-search-input";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/src/lib/components/ui/tabs";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { AdminListPage } from "@/src/lib/domains/admin/admin-list-page";
import { AdminListPageChrome } from "@/src/lib/domains/admin/admin-list-page-chrome";
import { AdminInvitesCreateDialog } from "@/src/lib/domains/admin/components/invites-create-dialog";
import { AdminDataTable } from "@/src/lib/domains/admin/data-table";
import { deriveAdminTableStatus } from "@/src/lib/domains/admin/hooks/derive-table-status";
import { useAdminPageClamp } from "@/src/lib/domains/admin/hooks/use-admin-page-clamp";
import { AdminPagination } from "@/src/lib/domains/admin/pagination";
import {
	type AdminInvitesSearch,
	zAdminInvitesSearch,
} from "@/src/lib/domains/admin/search-schemas";
import { useAdminListSearch } from "@/src/lib/domains/admin/use-admin-list-search";
import { formatAdminDateTime } from "@/src/lib/domains/admin/utils/format-date";
import { cn } from "@/src/lib/utils";

const routeApi = getRouteApi("/admin/invites/");

type AdminInviteRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["invites"]["list"]["items"][number];

const INVITE_EMAIL_VARIANT_LABELS: Record<
	AdminInviteRow["emailVariant"],
	string
> = {
	warm: "Warm outreach",
	cold: "Cold outreach",
	custom: "Custom message",
};

export function AdminInvitesPage() {
	const search = routeApi.useSearch();
	const navigate = useNavigate({ from: "/admin/invites/" });
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const onQChange = useCallback(
		(q: string | undefined) => {
			void navigate({
				search: (prev) => ({ ...prev, q, page: 1 }),
				replace: true,
			});
		},
		[navigate],
	);

	const { searchInput, setSearchInput } = useAdminListSearch({
		q: search.q,
		onQChange,
	});

	const listQuery = useQuery({
		...rpcQuery.platformAdmin.invites.list.queryOptions({
			input: {
				page: search.page,
				q: search.q,
				status: search.status,
			},
		}),
		placeholderData: keepPreviousData,
	});

	const data = listQuery.data;
	const tableStatus = deriveAdminTableStatus(listQuery, (d) => d.items);

	useAdminPageClamp({
		page: search.page,
		totalPages: data?.totalPages,
		navigate,
	});

	const revokeInvite = useMutation({
		mutationFn: (inviteId: string) =>
			rpc.platformAdmin.invites.revoke({ inviteId }),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.invites.list.key(),
			});
		},
	});

	const sendInviteEmail = useMutation({
		mutationFn: (inviteId: string) =>
			rpc.platformAdmin.invites.send({ inviteId }),
		onSuccess: (result) => {
			if (result.emailSent && result.email) {
				toastUser.success(TOASTS.admin.inviteSent(result.email));
			} else if (result.email) {
				const readyCopy = TOASTS.admin.inviteReadyNoEmail(result.email);
				toastUser.success(readyCopy.title, { hint: readyCopy.hint });
			}
		},
	});

	const rebookInvite = useMutation({
		mutationFn: (args: {
			inviteId: string;
			email?: string | null;
			partnerName?: string | null;
		}) => rpc.platformAdmin.invites.rebook({ inviteId: args.inviteId }),
		onSuccess: (_result, variables) => {
			if (variables.email) {
				const label = variables.partnerName
					? `${variables.partnerName} (${variables.email})`
					: variables.email;
				toastUser.success(TOASTS.admin.inviteReissued(label));
			} else {
				toastUser.success(TOASTS.admin.inviteReissuedGeneric);
			}
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.invites.list.key(),
			});
		},
	});

	const setStatus = (status: AdminInvitesSearch["status"]) => {
		void navigate({
			search: (prev) => ({ ...prev, status, page: 1 }),
			replace: true,
		});
	};

	return (
		<AdminListPage>
			<AdminListPageChrome
				title="Partner invites"
				description="Create design partner trial invites, send emails, and track redemptions."
				actions={
					<Button
						type="button"
						variant="primary"
						size="sm"
						className="gap-2"
						onClick={() => setCreateOpen(true)}
					>
						<PlusIcon className="size-4" weight="bold" />
						New invite
					</Button>
				}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Tabs
						value={search.status}
						onValueChange={(v) => setStatus(v as AdminInvitesSearch["status"])}
					>
						<TabsList variant="line" className="h-10 w-full justify-start">
							<TabsTrigger value="all">All</TabsTrigger>
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="revoked">Revoked</TabsTrigger>
							<TabsTrigger value="expired">Expired</TabsTrigger>
						</TabsList>
					</Tabs>
					<PageSearchInput
						value={searchInput}
						onChange={setSearchInput}
						placeholder="Search email or name…"
						aria-label="Search invites"
					/>
				</div>
			</AdminListPageChrome>

			<AdminListPage.Body>
				<AdminDataTable
					status={tableStatus}
					isFetching={listQuery.isFetching}
					emptyTitle="No invites match your filters."
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Created</TableHead>
								<TableHead>Partner / email</TableHead>
								<TableHead>Plan</TableHead>
								<TableHead>Variant</TableHead>
								<TableHead>Redemptions</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.items.map((invite) => {
								const id = String(invite.id);
								const token = String(invite.token);
								const inviteUrl = `${env.VITE_CLIENT_URL.replace(/\/$/, "")}/?platformInvite=${encodeURIComponent(token)}`;
								const isRevoked = Boolean(invite.revokedAt);
								const isRedeemed =
									invite.redemptionCount === invite.maxRedemptions;
								const expanded = expandedId === id;

								return (
									<Fragment key={id}>
										<TableRow
											className={cn(expanded && "bg-muted/20")}
											onClick={() =>
												setExpandedId((cur) => (cur === id ? null : id))
											}
										>
											<TableCell>
												{formatAdminDateTime(invite.createdAt)}
											</TableCell>
											<TableCell>
												<div className="min-w-0">
													<p className="truncate font-medium">
														{invite.note ?? invite.email ?? id}
													</p>
													{invite.note && invite.email ? (
														<p className="truncate text-xs text-muted-foreground">
															{invite.email}
														</p>
													) : null}
												</div>
											</TableCell>
											<TableCell>
												{getPlanName(invite.planId as PlanId)}
											</TableCell>
											<TableCell>
												{INVITE_EMAIL_VARIANT_LABELS[invite.emailVariant]}
											</TableCell>
											<TableCell>
												{invite.redemptionCount}/{invite.maxRedemptions}
											</TableCell>
											<TableCell>
												{isRevoked ? (
													<Badge variant="destructive">Revoked</Badge>
												) : isRedeemed ? (
													<Badge variant="outline">Redeemed</Badge>
												) : (
													<Badge variant="secondary">Active</Badge>
												)}
											</TableCell>
											<TableCell
												className="text-right"
												onClick={(e) => e.stopPropagation()}
											>
												<div className="flex flex-wrap justify-end gap-1">
													{invite.email && !isRevoked ? (
														<Button
															size="sm"
															variant="outline"
															onClick={() => sendInviteEmail.mutate(id)}
															isLoading={
																sendInviteEmail.isPending &&
																sendInviteEmail.variables === id
															}
														>
															Send
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
											</TableCell>
										</TableRow>
										{expanded ? (
											<TableRow className="bg-muted/10 hover:bg-muted/10">
												<TableCell colSpan={7} className="space-y-3">
													<div className="flex items-center gap-2 font-mono text-xs">
														<span className="truncate">{inviteUrl}</span>
														<CopyButton text={inviteUrl} />
													</div>
													{invite.redemptions.length > 0 ? (
														<ul className="space-y-1 text-xs text-muted-foreground">
															{invite.redemptions.map((r) => (
																<li key={`${r.walletAddress}-${r.redeemedAt}`}>
																	{r.email ?? r.walletAddress} ·{" "}
																	{formatAdminDateTime(r.redeemedAt)}
																</li>
															))}
														</ul>
													) : (
														<p className="text-xs text-muted-foreground">
															No redemptions yet.
														</p>
													)}
												</TableCell>
											</TableRow>
										) : null}
									</Fragment>
								);
							})}
						</TableBody>
					</Table>
				</AdminDataTable>

				{data && data.totalCount > 0 ? (
					<AdminPagination
						page={data.page}
						totalPages={data.totalPages}
						totalCount={data.totalCount}
						isFetching={listQuery.isFetching}
						onPageChange={(page) => {
							void navigate({
								search: (prev) => ({ ...prev, page }),
								replace: true,
							});
						}}
					/>
				) : null}
			</AdminListPage.Body>

			<AdminInvitesCreateDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
			/>
		</AdminListPage>
	);
}

export { zAdminInvitesSearch };
