import { useFilosignContext } from "@filosign/react";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import { FEEDBACK_COPY } from "@/src/lib/copy/feedback";
import { AdminListPage } from "@/src/lib/domains/admin/admin-list-page";
import { AdminListPageChrome } from "@/src/lib/domains/admin/admin-list-page-chrome";
import { AdminDataTable } from "@/src/lib/domains/admin/data-table";
import { deriveAdminTableStatus } from "@/src/lib/domains/admin/hooks/derive-table-status";
import { useAdminPageClamp } from "@/src/lib/domains/admin/hooks/use-admin-page-clamp";
import { AdminPagination } from "@/src/lib/domains/admin/pagination";
import { zAdminFeedbackSearch } from "@/src/lib/domains/admin/search-schemas";
import { formatAdminDateTime } from "@/src/lib/domains/admin/utils/format-date";
import { cn } from "@/src/lib/utils";

const routeApi = getRouteApi("/admin/feedback/");
const NOTE_PREVIEW_LENGTH = 80;

type FeedbackAdminRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["feedback"]["list"]["items"][number];

function formatUserLabel(row: FeedbackAdminRow): string {
	if (row.userEmail?.trim()) return row.userEmail.trim();
	const wallet = row.walletAddress;
	if (wallet.length <= 12) return wallet;
	return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function truncateText(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength).trimEnd()}…`;
}

export function AdminFeedbackPage() {
	const search = routeApi.useSearch();
	const navigate = useNavigate({ from: "/admin/feedback/" });
	const { rpcQuery } = useFilosignContext();
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

	const feedbackQuery = useQuery({
		...rpcQuery.platformAdmin.feedback.list.queryOptions({
			input: { page: search.page },
		}),
		placeholderData: keepPreviousData,
	});

	const data = feedbackQuery.data;
	const tableStatus = deriveAdminTableStatus(
		feedbackQuery,
		(data) => data.items,
	);

	useAdminPageClamp({
		page: search.page,
		totalPages: data?.totalPages,
		navigate,
	});

	useEffect(() => {
		setExpandedRowId(null);
	}, [search.page]);

	return (
		<AdminListPage>
			<AdminListPageChrome
				title="Product feedback"
				description="Notes submitted from the in-app feedback dialog."
			/>

			<AdminListPage.Body>
				<AdminDataTable
					status={tableStatus}
					isFetching={feedbackQuery.isFetching}
					emptyTitle="No feedback yet"
					emptyDescription="Submissions appear after users share feedback from the app."
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Submitted</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>User</TableHead>
								<TableHead>Area</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead>Route</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.items.map((row) => {
								const isExpanded = expandedRowId === row.id;
								const note = row.message?.trim() ?? "";
								const notePreview = note
									? truncateText(note, NOTE_PREVIEW_LENGTH)
									: "N/A";

								return (
									<Fragment key={row.id}>
										<TableRow
											className={cn(
												"cursor-pointer",
												isExpanded && "bg-muted/30",
											)}
											onClick={() =>
												setExpandedRowId((current) =>
													current === row.id ? null : row.id,
												)
											}
										>
											<TableCell>
												{formatAdminDateTime(row.createdAt)}
											</TableCell>
											<TableCell>{FEEDBACK_COPY.kinds[row.kind]}</TableCell>
											<TableCell>{formatUserLabel(row)}</TableCell>
											<TableCell>
												{FEEDBACK_COPY.areas[row.featureArea]}
											</TableCell>
											<TableCell className="max-w-56 whitespace-normal">
												{notePreview}
											</TableCell>
											<TableCell className="max-w-40 truncate">
												{row.route ?? "N/A"}
											</TableCell>
										</TableRow>
										{isExpanded && note ? (
											<TableRow className="bg-muted/20 hover:bg-muted/20">
												<TableCell
													colSpan={6}
													className="whitespace-normal p-4 text-sm leading-relaxed"
												>
													{note}
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
						isFetching={feedbackQuery.isFetching}
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

export { zAdminFeedbackSearch };
