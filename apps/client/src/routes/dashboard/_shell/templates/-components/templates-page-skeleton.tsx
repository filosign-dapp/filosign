import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { cn } from "@/src/lib/utils/index";
import {
	documentsPageBodyInset,
	documentsPageInset,
	documentsPageToolbar,
} from "@/src/routes/dashboard/_shell/document/all/-lib/documents-page-layout";
import { TemplatesContentSkeleton } from "./templates-content-skeleton";

export function TemplatesPageSkeleton() {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background @container">
			<div
				className={cn(
					documentsPageToolbar,
					documentsPageInset,
					"sticky top-0 z-10 shrink-0 pt-4 pb-0",
				)}
			>
				<div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
					<Skeleton className="h-6 w-44" />
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 md:gap-4">
						<Skeleton className="h-9 w-full sm:w-52 md:w-60" />
						<Skeleton className="h-9 w-32 rounded-md" />
					</div>
				</div>
			</div>
			<TemplatesContentSkeleton
				className={cn(documentsPageBodyInset, "min-h-0 flex-1")}
			/>
		</div>
	);
}
