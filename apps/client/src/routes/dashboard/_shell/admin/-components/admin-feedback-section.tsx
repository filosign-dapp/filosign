import { useFilosignContext } from "@filosign/react";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { NotePencilIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { AdminSectionEmpty } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import { FEEDBACK_COPY } from "@/src/lib/copy/feedback";
import { cn } from "@/src/lib/utils";

type FeedbackAdminRow =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["feedback"]["list"]["items"][number];

const NOTE_PREVIEW_LENGTH = 80;

function formatSubmittedAt(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

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

export function AdminFeedbackSection(props: { enabled: boolean }) {
	const { rpcQuery } = useFilosignContext();
	const [page, setPage] = useState(1);
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

	const feedbackQuery = useQuery({
		...rpcQuery.platformAdmin.feedback.list.queryOptions({
			input: { page },
		}),
		enabled: props.enabled,
		retry: false,
	});

	const data = feedbackQuery.data;
	const totalPages = data?.totalPages ?? 0;

	useEffect(() => {
		if (!data || totalPages === 0) {
			if (page !== 1) setPage(1);
			return;
		}
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [data, page, totalPages]);

	useEffect(() => {
		setExpandedRowId(null);
	}, [page]);

	if (!props.enabled) {
		return null;
	}

	return (
		<section className="overflow-hidden rounded-xl border border-border/80 bg-card/40">
			<div className="border-b border-border/60 bg-muted/15 px-6 py-4">
				<div className="flex gap-3">
					<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground">
						<NotePencilIcon className="size-5" aria-hidden />
					</div>
					<div>
						<h2 className="text-base font-medium text-foreground">
							Product feedback
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Review notes submitted from the in-app feedback dialog.
						</p>
					</div>
				</div>
			</div>

			<div className="p-6">
				{feedbackQuery.isLoading ? (
					<p className="text-sm text-muted-foreground">Loading feedback…</p>
				) : feedbackQuery.isError ? (
					<p className="text-sm text-destructive">
						Could not load feedback submissions.
					</p>
				) : !data || data.items.length === 0 ? (
					<AdminSectionEmpty
						title="No feedback yet"
						description="Submissions will appear here after users share feedback from the app."
					/>
				) : (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							{data.totalCount} submission{data.totalCount === 1 ? "" : "s"}
						</p>

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
								{data.items.map((row) => {
									const isExpanded = expandedRowId === row.id;
									const note = row.message?.trim() ?? "";
									const notePreview = note
										? truncateText(note, NOTE_PREVIEW_LENGTH)
										: "—";

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
													{formatSubmittedAt(row.createdAt)}
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
													{row.route ?? "—"}
												</TableCell>
											</TableRow>
											{isExpanded && note ? (
												<TableRow className="bg-muted/20 hover:bg-muted/20">
													<TableCell
														colSpan={6}
														className="whitespace-normal p-4 text-sm leading-relaxed text-foreground"
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

						<div className="flex flex-wrap items-center justify-between gap-3">
							<p className="text-sm text-muted-foreground">
								Page {data.page} of {Math.max(totalPages, 1)}
							</p>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={page <= 1 || feedbackQuery.isFetching}
									onClick={() => setPage((current) => Math.max(1, current - 1))}
								>
									Previous
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={
										totalPages === 0 ||
										page >= totalPages ||
										feedbackQuery.isFetching
									}
									onClick={() =>
										setPage((current) =>
											totalPages === 0
												? current
												: Math.min(totalPages, current + 1),
										)
									}
								>
									Next
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
