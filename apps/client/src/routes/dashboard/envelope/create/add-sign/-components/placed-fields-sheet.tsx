import {
	CaretRightIcon,
	ListChecksIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/src/lib/components/ui/alert-dialog";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import { useAddSignPlacement } from "@/src/lib/domains/placement/context";
import {
	countFieldsByAssignee,
	resolveActiveAssignee,
} from "@/src/lib/domains/placement/utils/active-assignees";
import { filterPlacedFieldsByAssignee } from "@/src/lib/domains/placement/utils/placed-fields";
import { useIsMobile } from "@/src/lib/utils/use-mobile";
import { cn } from "@/src/lib/utils/utils";
import { ActiveAssigneeStrip } from "@/src/routes/dashboard/envelope/create/add-sign/-components/active-assignee-strip";
import { PlacedFieldsIndex } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-index";

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
		signatureFields,
		currentDocument,
		selectedFieldIds,
		focusFieldOnCanvas,
		handleClearAllFields,
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

	const isSidebar = variant === "sidebar";
	const totalFields = currentDocumentFields.length;
	const assigneeFields = placedFieldsForAssignee.length;

	if (!isSidebar && totalFields === 0) return null;

	const handleFocusField = (fieldId: string) => {
		focusFieldOnCanvas(fieldId);
		setOpen(false);
	};

	const subtitle =
		totalFields === 0
			? "No fields on this document yet"
			: assigneeFields === totalFields
				? `${totalFields} field${totalFields === 1 ? "" : "s"} on this document`
				: `${assigneeFields} of ${totalFields} for active signer`;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			{isSidebar ? (
				<SheetTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							className={cn(
								"group h-auto w-full justify-start gap-3 rounded-lg px-2 py-2.5 text-left font-normal",
								"hover:bg-muted/40",
							)}
						/>
					}
				>
					<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/40">
						<ListChecksIcon
							className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
							weight="regular"
							aria-hidden
						/>
					</div>
					<div className="min-w-0 flex-1 text-left">
						<p className="text-sm font-medium text-foreground">Placed fields</p>
						<p className="truncate text-xs text-muted-foreground">{subtitle}</p>
					</div>
					{totalFields > 0 ? (
						<Badge variant="secondary" className="shrink-0 tabular-nums">
							{totalFields}
						</Badge>
					) : null}
					<CaretRightIcon
						className="size-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
						weight="bold"
						aria-hidden
					/>
				</SheetTrigger>
			) : (
				<SheetTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							className="relative"
							aria-label={`Placed fields, ${totalFields} total`}
						/>
					}
				>
					<ListChecksIcon className="size-4" aria-hidden />
					{totalFields > 0 ? (
						<Badge
							variant="secondary"
							className="absolute -top-1 -right-1 h-4 min-w-4 px-1 py-0 text-[10px] tabular-nums"
						>
							{totalFields > 9 ? "9+" : totalFields}
						</Badge>
					) : null}
				</SheetTrigger>
			)}
			<SheetContent
				side={isMobile ? "bottom" : "left"}
				className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
			>
				<SheetHeader className="shrink-0 border-b border-border">
					<div className="flex items-start justify-between gap-3 pr-8">
						<div className="min-w-0 flex-1">
							<SheetTitle>Placed fields</SheetTitle>
							<SheetDescription>
								{currentDocument?.name ? (
									<span className="block truncate" title={currentDocument.name}>
										{currentDocument.name}
									</span>
								) : null}
								<span>
									{assigneeFields} of {totalFields} on this document ·{" "}
									{activeAssigneeLabel}
								</span>
							</SheetDescription>
						</div>
						{signatureFields.length > 0 ? (
							<AlertDialog>
								<AlertDialogTrigger
									render={
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className="shrink-0 text-muted-foreground hover:text-destructive"
											aria-label="Clear all fields"
										/>
									}
								>
									<TrashIcon className="size-4" />
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Clear all fields?</AlertDialogTitle>
										<AlertDialogDescription>
											Remove all placed fields on this envelope? You can undo
											this action immediately after.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											variant="destructive"
											onClick={() => {
												handleClearAllFields();
												setOpen(false);
											}}
										>
											Clear all
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						) : null}
					</div>
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
						currentPage={currentPage}
						onFocusField={handleFocusField}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
