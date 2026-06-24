import { getPlanName, PLAN_IDS, type PlanId } from "@filosign/entitlements";
import { useFilosignContext } from "@filosign/react";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { PageSearchInput } from "@/src/lib/components/app/page-search-input";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { toastUser } from "@/src/lib/copy/toast";
import { AdminListPage } from "@/src/lib/domains/admin/admin-list-page";
import { AdminListPageChrome } from "@/src/lib/domains/admin/admin-list-page-chrome";
import { AdminDataTable } from "@/src/lib/domains/admin/data-table";
import { deriveAdminTableStatus } from "@/src/lib/domains/admin/hooks/derive-table-status";
import { useAdminPageClamp } from "@/src/lib/domains/admin/hooks/use-admin-page-clamp";
import { AdminPagination } from "@/src/lib/domains/admin/pagination";
import { zAdminUsersSearch } from "@/src/lib/domains/admin/search-schemas";
import { useAdminListSearch } from "@/src/lib/domains/admin/use-admin-list-search";
import { formatAdminDateTime } from "@/src/lib/domains/admin/utils/format-date";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";

const routeApi = getRouteApi("/admin/users/");

type AdminUserRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["users"]["list"]["items"][number];

export function AdminUsersPage() {
	const search = routeApi.useSearch();
	const navigate = useNavigate({ from: "/admin/users/" });
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	const [planDialogUser, setPlanDialogUser] = useState<AdminUserRow | null>(
		null,
	);
	const [overrideDialogUser, setOverrideDialogUser] =
		useState<AdminUserRow | null>(null);
	const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");
	const [overrideJson, setOverrideJson] = useState("{}");

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
		...rpcQuery.platformAdmin.users.list.queryOptions({
			input: {
				page: search.page,
				q: search.q,
				planId: search.planId,
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

	const invalidate = () => {
		void queryClient.invalidateQueries({
			queryKey: rpcQuery.platformAdmin.users.list.key(),
		});
	};

	const setPlan = useMutation({
		mutationFn: (args: { wallet: string; planId: PlanId }) =>
			rpc.platformAdmin.users.setPlan(args),
		onSuccess: () => {
			invalidate();
			setPlanDialogUser(null);
			toastUser.success("Plan updated");
		},
		onError: (err) => showAppErrorToast(err),
	});

	const setOverrides = useMutation({
		mutationFn: (args: {
			wallet: string;
			featureOverrides: Record<string, number | boolean>;
		}) => rpc.platformAdmin.users.setFeatureOverrides(args),
		onSuccess: () => {
			invalidate();
			setOverrideDialogUser(null);
			toastUser.success("Feature overrides updated");
		},
		onError: (err) => showAppErrorToast(err),
	});

	return (
		<AdminListPage>
			<AdminListPageChrome
				title="Users"
				description="Registered accounts, subscription plans, and feature overrides."
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Select
						value={search.planId ?? "all"}
						onValueChange={(v) => {
							void navigate({
								search: (prev) => ({
									...prev,
									planId: v === "all" ? undefined : (v as PlanId),
									page: 1,
								}),
								replace: true,
							});
						}}
					>
						<SelectTrigger className="w-full sm:w-44">
							<SelectValue placeholder="All plans" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All plans</SelectItem>
							{PLAN_IDS.map((planId) => (
								<SelectItem key={planId} value={planId}>
									{getPlanName(planId)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<PageSearchInput
						value={searchInput}
						onChange={setSearchInput}
						placeholder="Search email or wallet…"
						aria-label="Search users"
					/>
				</div>
			</AdminListPageChrome>

			<AdminListPage.Body>
				<AdminDataTable
					status={tableStatus}
					isFetching={listQuery.isFetching}
					emptyTitle="No users match your filters."
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Email</TableHead>
								<TableHead>Wallet</TableHead>
								<TableHead>Plan</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Joined</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.items.map((user) => (
								<TableRow key={user.walletAddress}>
									<TableCell>{user.email ?? "–"}</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 font-mono text-xs">
											<span className="max-w-36 truncate">
												{user.walletAddress}
											</span>
											<CopyButton text={user.walletAddress} />
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="outline">
											{getPlanName(user.planId as PlanId)}
										</Badge>
									</TableCell>
									<TableCell className="capitalize">{user.status}</TableCell>
									<TableCell>
										{formatAdminDateTime(user.createdAt).split(",")[0]}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													setPlanDialogUser(user);
													setSelectedPlan(user.planId as PlanId);
												}}
											>
												Plan
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													setOverrideDialogUser(user);
													setOverrideJson(
														JSON.stringify(
															user.featureOverrides ?? {},
															null,
															2,
														),
													);
												}}
											>
												Overrides
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
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

			<Dialog
				open={planDialogUser !== null}
				onOpenChange={(open) => {
					if (!open) setPlanDialogUser(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change plan</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label>Plan</Label>
						<Select
							value={selectedPlan}
							onValueChange={(v) => setSelectedPlan(v as PlanId)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PLAN_IDS.map((planId) => (
									<SelectItem key={planId} value={planId}>
										{getPlanName(planId)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							variant="primary"
							isLoading={setPlan.isPending}
							onClick={() => {
								if (!planDialogUser) return;
								setPlan.mutate(
									{
										wallet: planDialogUser.walletAddress,
										planId: selectedPlan,
									},
									suppressGlobalErrorToast(),
								);
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={overrideDialogUser !== null}
				onOpenChange={(open) => {
					if (!open) setOverrideDialogUser(null);
				}}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Feature overrides</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="override-json">JSON object</Label>
						<Textarea
							id="override-json"
							value={overrideJson}
							onChange={(e) => setOverrideJson(e.target.value)}
							className="min-h-32 font-mono text-xs"
							rows={6}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="primary"
							isLoading={setOverrides.isPending}
							onClick={() => {
								if (!overrideDialogUser) return;
								try {
									const parsed = JSON.parse(overrideJson) as Record<
										string,
										number | boolean
									>;
									setOverrides.mutate(
										{
											wallet: overrideDialogUser.walletAddress,
											featureOverrides: parsed,
										},
										suppressGlobalErrorToast(),
									);
								} catch {
									showAppErrorToast(new Error("Invalid JSON"));
								}
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</AdminListPage>
	);
}

export { zAdminUsersSearch };
