import { FilePdfIcon, FileTextIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import { cn } from "@/src/lib/utils/utils";
import type { DocumentListRailItem } from "./document-list-rail";

type DocumentSwitcherSheetProps = {
	documents: DocumentListRailItem[];
	currentDocumentId: string;
	onDocumentSelect: (documentId: string) => void;
	triggerLabel?: string;
};

export function DocumentSwitcherSheet({
	documents,
	currentDocumentId,
	onDocumentSelect,
	triggerLabel = "Documents",
}: DocumentSwitcherSheetProps) {
	if (documents.length <= 1) {
		return null;
	}

	return (
		<Sheet>
			<SheetTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="min-h-11 gap-2"
					/>
				}
			>
				<FileTextIcon className="size-4" weight="duotone" />
				{triggerLabel}
			</SheetTrigger>
			<SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Documents</SheetTitle>
				</SheetHeader>
				<ul className="mt-4 space-y-1">
					{documents.map((doc) => {
						const isActive = currentDocumentId === doc.id;
						const fieldLabel =
							doc.meta ??
							(doc.fieldCount != null
								? `${doc.fieldCount} field${doc.fieldCount === 1 ? "" : "s"}`
								: undefined);

						return (
							<li key={doc.id}>
								<button
									type="button"
									className={cn(
										"flex w-full min-h-11 items-center gap-2.5 rounded-md border-l-2 px-2 py-2 text-left transition-colors",
										isActive
											? "border-l-primary bg-primary/5"
											: "border-l-transparent hover:bg-muted/40",
									)}
									onClick={() => onDocumentSelect(doc.id)}
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
										{fieldLabel ? (
											<span className="block text-[11px] text-muted-foreground">
												{fieldLabel}
											</span>
										) : null}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</SheetContent>
		</Sheet>
	);
}
