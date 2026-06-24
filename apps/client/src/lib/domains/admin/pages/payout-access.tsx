import { useFilosignContext } from "@filosign/react";
import { isoCountryName } from "@filosign/shared";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Fragment, useCallback, useState } from "react";
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
import { AdminListPage } from "@/src/lib/domains/admin/admin-list-page";
import { AdminListPageChrome } from "@/src/lib/domains/admin/admin-list-page-chrome";
import { PayoutAccessReviewNote } from "@/src/lib/domains/admin/components/payout-access-review-note";
import { AdminDataTable } from "@/src/lib/domains/admin/data-table";
import { deriveAdminTableStatus } from "@/src/lib/domains/admin/hooks/derive-table-status";
import { useAdminPageClamp } from "@/src/lib/domains/admin/hooks/use-admin-page-clamp";
import { AdminPagination } from "@/src/lib/domains/admin/pagination";
import {
	type AdminPayoutAccessSearch,
	zAdminPayoutAccessSearch,
} from "@/src/lib/domains/admin/search-schemas";
import { useAdminListSearch } from "@/src/lib/domains/admin/use-admin-list-search";
import { formatAdminDateTime } from "@/src/lib/domains/admin/utils/format-date";
import { formatInlineAppError } from "@/src/lib/errors";
import { cn } from "@/src/lib/utils";

const routeApi = getRouteApi("/admin/payout-access/");

export function AdminPayoutAccessPage() {
	const search = routeApi.useSearch();
	const navigate = useNavigate({ from: "/admin/payout-access/" });
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const [reviewNote, setReviewNote] = useState("");
	const [error, setError] = useState<string | null>(null);
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
		...rpcQuery.platformAdmin.settlementFeatureAccess.list.queryOptions({
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

	const invalidate = () => {
		void queryClient.invalidateQueries({
			queryKey: rpcQuery.platformAdmin.settlementFeatureAccess.list.key(),
		});
	};

	const approveSettlementAccess = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: (organizationId: string) =>
			rpc.platformAdmin.settlementFeatureAccess.approve({
				organizationId,
				reviewNote: reviewNote.trim() || undefined,
			}),
		onSuccess: () => {
			invalidate();
			setReviewNote("");
			setError(null);
		},
		onError: (err) => setError(formatInlineAppError(err)),
	});

	const rejectSettlementAccess = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: (organizationId: string) =>
			rpc.platformAdmin.settlementFeatureAccess.reject({
				organizationId,
				reviewNote: reviewNote.trim() || undefined,
			}),
		onSuccess: () => {
			invalidate();
			setReviewNote("");
			setError(null);
		},
		onError: (err) => setError(formatInlineAppError(err)),
	});

	const setExternalWalletAccess = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: (args: { organizationId: string; enabled: boolean }) =>
			rpc.platformAdmin.settlementFeatureAccess.setExternalWalletAccess(args),
		onSuccess: () => invalidate(),
		onError: (err) => setError(formatInlineAppError(err)),
	});

	const setStatus = (status: AdminPayoutAccessSearch["status"]) => {
		void navigate({
			search: (prev) => ({ ...prev, status, page: 1 }),
			replace: true,
		});
	};

	return (
		<AdminListPage>
			<AdminListPageChrome
				title="Payout access"
				description="Review workspace requests for programmatic USDC payout attachment."
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Tabs
						value={search.status}
						onValueChange={(v) =>
							setStatus(v as AdminPayoutAccessSearch["status"])
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
						placeholder="Search workspace…"
						aria-label="Search payout access requests"
					/>
				</div>
			</AdminListPageChrome>

			<AdminListPage.Body>
				<PayoutAccessReviewNote
					reviewNote={reviewNote}
					onReviewNoteChange={setReviewNote}
					error={error}
				/>

				<AdminDataTable
					status={tableStatus}
					isFetching={listQuery.isFetching}
					emptyTitle="No payout access requests match your filters."
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Workspace</TableHead>
								<TableHead>Requester</TableHead>
								<TableHead>Country</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>External wallets</TableHead>
								<TableHead>Reviewed</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.items.map((row) => {
								const organizationId = String(row.organizationId);
								const status = String(row.status ?? "none");
								const expanded = expandedId === organizationId;

								return (
									<Fragment key={organizationId}>
										<TableRow
											className={cn(
												"cursor-pointer",
												expanded && "bg-muted/20",
											)}
											onClick={() =>
												setExpandedId((cur) =>
													cur === organizationId ? null : organizationId,
												)
											}
										>
											<TableCell className="font-medium">
												{row.organizationName}
											</TableCell>
											<TableCell>
												{row.requesterName ?? row.acceptedByWallet.slice(0, 10)}
											</TableCell>
											<TableCell>
												{row.organizationCountry
													? (isoCountryName(row.organizationCountry) ??
														row.organizationCountry)
													: "–"}
											</TableCell>
											<TableCell>
												<Badge variant="secondary" className="capitalize">
													{status}
												</Badge>
											</TableCell>
											<TableCell>
												{row.externalWalletAccessEnabled
													? "On"
													: row.externalWalletAccessRequested
														? "Requested"
														: "Off"}
											</TableCell>
											<TableCell>
												{formatAdminDateTime(row.reviewedAt)}
											</TableCell>
										</TableRow>
										{expanded ? (
											<TableRow className="bg-muted/10 hover:bg-muted/10">
												<TableCell colSpan={6} className="space-y-4">
													{row.useCase ? (
														<p className="whitespace-pre-wrap text-sm">
															{row.useCase}
														</p>
													) : null}
													<div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
														<p>
															Legal name:{" "}
															<span className="text-foreground">
																{row.organizationLegalName ?? "–"}
															</span>
														</p>
														<p>
															Requester role:{" "}
															<span className="text-foreground">
																{row.requesterRole ?? "–"}
															</span>
														</p>
														<p className="break-all font-mono sm:col-span-2">
															Wallet: {row.acceptedByWallet}
															<CopyButton
																text={row.acceptedByWallet}
																className="ml-2 inline"
															/>
														</p>
														{row.reviewNote ? (
															<p className="sm:col-span-2 italic">
																Review note: {row.reviewNote}
															</p>
														) : null}
													</div>
													<div className="flex flex-wrap gap-2">
														{status === "pending" ? (
															<>
																<Button
																	size="sm"
																	variant="primary"
																	onClick={(e) => {
																		e.stopPropagation();
																		approveSettlementAccess.mutate(
																			organizationId,
																		);
																	}}
																	isLoading={
																		approveSettlementAccess.isPending &&
																		approveSettlementAccess.variables ===
																			organizationId
																	}
																>
																	Approve
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={(e) => {
																		e.stopPropagation();
																		rejectSettlementAccess.mutate(
																			organizationId,
																		);
																	}}
																	isLoading={
																		rejectSettlementAccess.isPending &&
																		rejectSettlementAccess.variables ===
																			organizationId
																	}
																>
																	Reject
																</Button>
															</>
														) : status === "approved" ? (
															<Button
																size="sm"
																variant="outline"
																onClick={(e) => {
																	e.stopPropagation();
																	setExternalWalletAccess.mutate({
																		organizationId,
																		enabled: !row.externalWalletAccessEnabled,
																	});
																}}
																isLoading={setExternalWalletAccess.isPending}
															>
																{row.externalWalletAccessEnabled
																	? "Revoke external wallets"
																	: "Allow external wallets"}
															</Button>
														) : null}
													</div>
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
		</AdminListPage>
	);
}

export { zAdminPayoutAccessSearch };
