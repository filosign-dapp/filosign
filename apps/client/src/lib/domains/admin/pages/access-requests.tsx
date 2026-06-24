import { useFilosignContext } from "@filosign/react";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
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
import { AdminDataTable } from "@/src/lib/domains/admin/data-table";
import { deriveAdminTableStatus } from "@/src/lib/domains/admin/hooks/derive-table-status";
import { useAdminPageClamp } from "@/src/lib/domains/admin/hooks/use-admin-page-clamp";
import { AdminPagination } from "@/src/lib/domains/admin/pagination";
import {
	type AdminAccessRequestsSearch,
	zAdminAccessRequestsSearch,
} from "@/src/lib/domains/admin/search-schemas";
import { useAdminListSearch } from "@/src/lib/domains/admin/use-admin-list-search";
import { formatAdminDateTime } from "@/src/lib/domains/admin/utils/format-date";

const routeApi = getRouteApi("/admin/access-requests/");

type AdminAccessRequestRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["accessRequests"]["list"]["items"][number];

export function AdminAccessRequestsPage() {
	const search = routeApi.useSearch();
	const navigate = useNavigate({ from: "/admin/access-requests/" });
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

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
		...rpcQuery.platformAdmin.accessRequests.list.queryOptions({
			input: {
				page: search.page,
				q: search.q,
				status: search.status,
			},
		}),
		placeholderData: keepPreviousData,
	});

	const data = listQuery.data;
	const tableStatus = deriveAdminTableStatus(listQuery, (data) => data.items);

	useAdminPageClamp({
		page: search.page,
		totalPages: data?.totalPages,
		navigate,
	});

	const approveAccessRequest = useMutation({
		mutationFn: (request: AdminAccessRequestRow) =>
			rpc.platformAdmin.accessRequests.approve({
				requestId: request.id,
				...(request.planId &&
				(request.planId === "individual" ||
					request.planId === "teams" ||
					request.planId === "teams_pro")
					? { planId: request.planId }
					: {}),
				...(request.billingInterval === "monthly" ||
				request.billingInterval === "yearly"
					? { interval: request.billingInterval }
					: {}),
				...(typeof request.seatCount === "number" && request.seatCount > 1
					? { seatCount: request.seatCount }
					: {}),
			}),
		onSuccess: (_data, request) => {
			toastUser.success(
				TOASTS.admin.checkoutLinkSent(String(request.email ?? "")),
			);
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.accessRequests.list.key(),
			});
		},
	});

	const rejectAccessRequest = useMutation({
		mutationFn: (requestId: string) =>
			rpc.platformAdmin.accessRequests.reject({ requestId }),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.accessRequests.list.key(),
			});
		},
	});

	const setStatus = (status: AdminAccessRequestsSearch["status"]) => {
		void navigate({
			search: (prev) => ({ ...prev, status, page: 1 }),
			replace: true,
		});
	};

	return (
		<AdminListPage>
			<AdminListPageChrome
				title="Access requests"
				description="Approve or reject beta signup requests and send checkout links."
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Tabs
						value={search.status}
						onValueChange={(v) =>
							setStatus(v as AdminAccessRequestsSearch["status"])
						}
					>
						<TabsList variant="line" className="h-10 w-full justify-start">
							<TabsTrigger value="pending">Pending</TabsTrigger>
							<TabsTrigger value="approved">Approved</TabsTrigger>
							<TabsTrigger value="rejected">Rejected</TabsTrigger>
							<TabsTrigger value="all">All</TabsTrigger>
						</TabsList>
					</Tabs>
					<PageSearchInput
						value={searchInput}
						onChange={setSearchInput}
						placeholder="Search email…"
						aria-label="Search access requests"
					/>
				</div>
			</AdminListPageChrome>

			<AdminListPage.Body>
				<AdminDataTable
					status={tableStatus}
					isFetching={listQuery.isFetching}
					emptyTitle="No access requests match your filters."
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Submitted</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Company</TableHead>
								<TableHead>Plan</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.items.map((request) => {
								const status = String(request.status ?? "pending");
								return (
									<TableRow key={request.id}>
										<TableCell>
											{formatAdminDateTime(request.createdAt)}
										</TableCell>
										<TableCell>{request.email}</TableCell>
										<TableCell>{request.name ?? "–"}</TableCell>
										<TableCell>{request.company ?? "–"}</TableCell>
										<TableCell>
											{request.planId ?? "–"}
											{request.seatCount > 1
												? ` · ${request.seatCount} seats`
												: ""}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													status === "rejected" ? "destructive" : "secondary"
												}
												className="capitalize"
											>
												{status}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{status === "pending" ? (
												<div className="flex justify-end gap-1">
													<Button
														size="sm"
														variant="primary"
														onClick={() => approveAccessRequest.mutate(request)}
														isLoading={
															approveAccessRequest.isPending &&
															approveAccessRequest.variables?.id === request.id
														}
													>
														Approve
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															rejectAccessRequest.mutate(request.id)
														}
														isLoading={
															rejectAccessRequest.isPending &&
															rejectAccessRequest.variables === request.id
														}
													>
														Reject
													</Button>
												</div>
											) : (
												<span className="text-xs text-muted-foreground">–</span>
											)}
										</TableCell>
									</TableRow>
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
		</AdminListPage>
	);
}

export { zAdminAccessRequestsSearch };
