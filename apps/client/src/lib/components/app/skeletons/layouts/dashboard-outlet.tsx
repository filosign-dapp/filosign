import { ListPageSkeleton } from "@/src/lib/components/app/skeletons/layouts/list-page";
import { cn } from "@/src/lib/utils/index";

/** Generic dashboard outlet placeholder while a child route chunk loads. */
export function DashboardOutletSkeleton({ className }: { className?: string }) {
	return (
		<ListPageSkeleton
			className={cn("min-h-0 flex-1 bg-background p-page", className)}
			rowCount={8}
		/>
	);
}
