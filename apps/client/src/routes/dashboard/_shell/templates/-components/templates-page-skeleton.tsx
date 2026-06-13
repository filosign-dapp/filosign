import { ListPageSkeleton } from "@/src/lib/components/app/skeletons";
import { Skeleton } from "@/src/lib/components/ui/skeleton";

export function TemplatesPageSkeleton() {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background @container">
			<div className="flex items-center justify-between border-b border-border/40 px-8 py-4">
				<div className="space-y-2">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="hidden h-3 w-64 sm:block" />
				</div>
				<Skeleton className="h-9 w-32 rounded-md" />
			</div>
			<ListPageSkeleton
				variant="cards"
				rowCount={6}
				className="min-h-0 flex-1 p-8"
			/>
		</div>
	);
}
