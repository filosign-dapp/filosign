import { FilePdfIcon, FileTextIcon, InfoIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import { cn } from "@/src/lib/utils";
import { DraftContextRail } from "@/src/routes/draft/review/-components/right/context-rail";
import {
	useDraftReviewMeta,
	useDraftReviewViewerSlice,
} from "@/src/routes/draft/review/-lib/context/context";
import { fieldCountByDocumentId } from "@/src/routes/draft/review/-lib/utils/snapshot-to-viewport";

export function DraftReviewMobileToolbar() {
	const {
		documents,
		currentDocumentId,
		setCurrentDocumentId,
		placementFields,
	} = useDraftReviewViewerSlice();
	const { isUnlocked } = useDraftReviewMeta();

	const fieldCounts = useMemo(
		() => fieldCountByDocumentId(placementFields),
		[placementFields],
	);

	const docRows = useMemo(() => {
		return documents.map((doc) => ({
			id: doc.id,
			name: doc.name,
			fieldCount: fieldCounts.get(doc.id) ?? 0,
		}));
	}, [documents, fieldCounts]);

	if (!isUnlocked) return null;

	const showDocumentsSheet = documents.length > 1;

	return (
		<div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-sm lg:hidden">
			<div className="flex items-center justify-center gap-3">
				{showDocumentsSheet ? (
					<Sheet>
						<SheetTrigger
							render={
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-2"
								/>
							}
						>
							<FileTextIcon className="size-4" weight="duotone" />
							Documents
						</SheetTrigger>
						<SheetContent
							side="bottom"
							className="max-h-[70vh] overflow-y-auto"
						>
							<SheetHeader>
								<SheetTitle>Documents</SheetTitle>
							</SheetHeader>
							<ul className="mt-4 space-y-1">
								{docRows.map((doc) => {
									const isActive = currentDocumentId === doc.id;
									return (
										<li key={doc.id}>
											<button
												type="button"
												className={cn(
													"flex w-full items-center gap-2.5 rounded-md border-l-2 px-2 py-2 text-left transition-colors",
													isActive
														? "border-l-primary bg-primary/5"
														: "border-l-transparent hover:bg-muted/40",
												)}
												onClick={() => setCurrentDocumentId(doc.id)}
											>
												<FilePdfIcon
													className={cn(
														"size-4 shrink-0",
														isActive ? "text-primary" : "text-destructive/70",
													)}
													weight="duotone"
													aria-hidden
												/>
												<span className="min-w-0 flex-1">
													<span
														className="block truncate text-sm font-medium"
														title={doc.name}
													>
														{doc.name}
													</span>
													<span className="block text-[11px] text-muted-foreground">
														{doc.fieldCount}{" "}
														{doc.fieldCount === 1 ? "field" : "fields"}
													</span>
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						</SheetContent>
					</Sheet>
				) : null}

				<Sheet>
					<SheetTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-2"
							/>
						}
					>
						<InfoIcon className="size-4" weight="duotone" />
						Context
					</SheetTrigger>
					<SheetContent
						side="bottom"
						className="max-h-[85vh] overflow-y-auto p-0"
					>
						<SheetHeader className="px-5 pt-5">
							<SheetTitle>Review context</SheetTitle>
						</SheetHeader>
						<DraftContextRail />
					</SheetContent>
				</Sheet>
			</div>
		</div>
	);
}
