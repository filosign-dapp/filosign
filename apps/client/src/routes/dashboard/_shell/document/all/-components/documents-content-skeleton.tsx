import { ListPageSkeleton } from "@/src/lib/components/app/skeletons";
import { cn } from "@/src/lib/utils/index";
import { documentsTableCard } from "@/src/routes/dashboard/_shell/document/all/-lib/documents-page-layout";

export function DocumentsContentSkeleton({
	variant = "table",
	className,
}: {
	variant?: "table" | "cards";
	className?: string;
}) {
	return (
		<ListPageSkeleton
			variant={variant}
			rowCount={variant === "cards" ? 6 : 8}
			className={cn(
				variant === "table" ? documentsTableCard : undefined,
				className,
			)}
		/>
	);
}
