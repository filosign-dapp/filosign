import { ListPageSkeleton } from "@/src/lib/components/app/skeletons/layouts/list-page";
import { cn } from "@/src/lib/utils/index";

/** Content-area placeholder while a shell child route chunk loads (inside DashboardLayout). */
export function DashboardOutletSkeleton({ className }: { className?: string }) {
	return (
		<ListPageSkeleton
			className={cn("min-h-0 flex-1 bg-background p-page", className)}
			rowCount={8}
		/>
	);
}
