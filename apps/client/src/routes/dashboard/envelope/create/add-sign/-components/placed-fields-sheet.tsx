import { ListChecksIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import { useIsMobile } from "@/src/lib/utils/use-mobile";
import { cn } from "@/src/lib/utils/utils";
import { ActiveAssigneeStrip } from "@/src/routes/dashboard/envelope/create/add-sign/-components/active-assignee-strip";
import { PlacedFieldsIndex } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-index";
import { useAddSignPlacement } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import {
	countFieldsByAssignee,
	resolveActiveAssignee,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/active-assignees";
import { filterPlacedFieldsByAssignee } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placed-fields";

type PlacedFieldsSheetProps = {
	variant?: "sidebar" | "toolbar";
};

export function PlacedFieldsSheet({
	variant = "toolbar",
}: PlacedFieldsSheetProps) {
	const [open, setOpen] = useState(false);
	const isMobile = useIsMobile();
	const {
		activeAssigneeId,
		setActiveAssigneeId,
		assignees,
		currentDocumentFields,
		currentDocument,
		selectedField,
		selectedFieldIds,
		focusFieldOnCanvas,
		handleRepeatFieldOnAllPages,
		pdfNumPages,
		currentPage,
	} = useAddSignPlacement();

	const activeAssignee = useMemo(
		() => resolveActiveAssignee(assignees, activeAssigneeId),
		[assignees, activeAssigneeId],
	);

	const documentFieldCounts = useMemo(
		() => countFieldsByAssignee(currentDocumentFields, assignees),
		[currentDocumentFields, assignees],
	);

	const placedFieldsForAssignee = useMemo(
		() => filterPlacedFieldsByAssignee(currentDocumentFields, activeAssignee),
		[currentDocumentFields, activeAssignee],
	);

	const activeAssigneeLabel = activeAssignee?.isSelf
		? "Me"
		: (activeAssignee?.name ?? "Signer");

	if (currentDocumentFields.length === 0) return null;

	const handleFocusField = (fieldId: string) => {
		focusFieldOnCanvas(fieldId);
		setOpen(false);
	};

	const isSidebar = variant === "sidebar";

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				render={
					<Button
						type="button"
						variant={isSidebar ? "outline" : "outline"}
						size={isSidebar ? "default" : "sm"}
						className={cn(
							isSidebar
								? "h-auto w-full justify-between gap-2 px-3 py-2.5"
								: "gap-1.5",
						)}
					/>
				}
			>
				<span className="flex min-w-0 items-center gap-2">
					<ListChecksIcon className="size-4 shrink-0" aria-hidden />
					<span className="truncate text-sm font-medium">Placed fields</span>
				</span>
				<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
					{placedFieldsForAssignee.length}/{currentDocumentFields.length}
				</span>
			</SheetTrigger>
			<SheetContent
				side={isMobile ? "bottom" : "left"}
				className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
			>
				<SheetHeader className="shrink-0 border-b border-border">
					<SheetTitle>Placed fields</SheetTitle>
					<SheetDescription>
						{currentDocument?.name ? (
							<span className="block truncate" title={currentDocument.name}>
								{currentDocument.name}
							</span>
						) : null}
						<span>
							{placedFieldsForAssignee.length} of {currentDocumentFields.length}{" "}
							on this document · {activeAssigneeLabel}
						</span>
					</SheetDescription>
				</SheetHeader>
				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
					<ActiveAssigneeStrip
						activeAssigneeId={activeAssigneeId}
						onSelect={setActiveAssigneeId}
						fieldCountsByAssigneeId={documentFieldCounts}
					/>
					<PlacedFieldsIndex
						fields={placedFieldsForAssignee}
						selectedFieldIds={selectedFieldIds}
						selectedField={selectedField}
						currentPage={currentPage}
						pdfNumPages={pdfNumPages}
						onSelectField={handleFocusField}
						onFocusField={handleFocusField}
						onRepeatOnAllPages={handleRepeatFieldOnAllPages}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
