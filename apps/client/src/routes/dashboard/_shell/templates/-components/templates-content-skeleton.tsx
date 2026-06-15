import { ListPageSkeleton } from "@/src/lib/components/app/skeletons";
import { cn } from "@/src/lib/utils/index";
import { documentsTableCard } from "@/src/routes/dashboard/_shell/document/all/-lib/documents-page-layout";

export function TemplatesContentSkeleton({
	className,
}: {
	className?: string;
}) {
	return (
		<ListPageSkeleton
			variant="table"
			rowCount={8}
			className={cn(documentsTableCard, className)}
		/>
	);
}
