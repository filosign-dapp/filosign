import { ListPageSkeleton } from "@/src/lib/components/app/skeletons";
import { documentsTableCard } from "@/src/lib/domains/admin/page-layout";
import { cn } from "@/src/lib/utils";

export function AdminTableSkeleton({ className }: { className?: string }) {
	return (
		<ListPageSkeleton
			variant="table"
			rowCount={8}
			className={cn(documentsTableCard, className)}
		/>
	);
}
