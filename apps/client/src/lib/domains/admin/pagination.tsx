import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";

export function AdminPagination(props: {
	page: number;
	totalPages: number;
	totalCount: number;
	isFetching?: boolean;
	onPageChange: (page: number) => void;
	className?: string;
}) {
	const { page, totalPages, totalCount, isFetching, onPageChange, className } =
		props;

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-3",
				className,
			)}
		>
			<p className="text-sm text-muted-foreground">
				{totalCount} {totalCount === 1 ? "result" : "results"} · Page {page} of{" "}
				{Math.max(totalPages, 1)}
			</p>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={page <= 1 || isFetching}
					onClick={() => onPageChange(Math.max(1, page - 1))}
				>
					Previous
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={
						totalPages === 0 || page >= totalPages || Boolean(isFetching)
					}
					onClick={() =>
						onPageChange(
							totalPages === 0 ? page : Math.min(totalPages, page + 1),
						)
					}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
