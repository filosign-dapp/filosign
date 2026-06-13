import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { cn } from "@/src/lib/utils/index";

export function ViewerChromeSkeleton({
	className,
	showSidebar = false,
}: {
	className?: string;
	showSidebar?: boolean;
}) {
	return (
		<div
			className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
			aria-busy="true"
			aria-live="polite"
			role="status"
		>
			<div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-4 w-40" />
				<Skeleton className="ml-auto h-9 w-24 rounded-md" />
			</div>
			<div className="flex min-h-0 flex-1 overflow-hidden">
				{showSidebar ? (
					<aside className="hidden w-64 shrink-0 border-r border-border p-4 lg:block">
						<div className="space-y-3">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-12 w-full rounded-lg" />
							<Skeleton className="h-12 w-full rounded-lg" />
							<Skeleton className="h-12 w-full rounded-lg" />
						</div>
					</aside>
				) : null}
				<div className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 p-6">
					<Skeleton className="aspect-3/4 w-full max-w-3xl rounded-lg" />
				</div>
			</div>
			<span className="sr-only">Loading document</span>
		</div>
	);
}
