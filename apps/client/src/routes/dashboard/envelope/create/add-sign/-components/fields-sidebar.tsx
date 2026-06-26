import { CaretDownIcon, FilePdfIcon, PenNibIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { useAddSignPlacement } from "@/src/lib/domains/placement/context";
import { PlacementFieldPaletteList } from "@/src/lib/domains/placement/field-palette";
import { usePdfAcroformImportUi } from "@/src/lib/domains/placement/pdf-acroform-import-context";
import { countFieldsByAssignee } from "@/src/lib/domains/placement/utils/active-assignees";
import { resolvePaletteHighlightedFieldType } from "@/src/lib/domains/placement/utils/palette-selection";
import { cn } from "@/src/lib/utils/utils";
import { ActiveAssigneeStrip } from "@/src/routes/dashboard/envelope/create/add-sign/-components/active-assignee-strip";
import { PlacedFieldsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-sheet";

export default function SignatureFieldsSidebar() {
	const {
		handlePaletteTypeClick,
		cancelPlacement,
		isPlacingField,
		pendingFieldType,
		placementFieldTypeLabel,
		activeAssigneeId,
		setActiveAssigneeId,
		assignees,
		currentDocumentFields,
		selectedFieldIds,
		signatureFields,
	} = useAddSignPlacement();
	const { canImportAcroform, detectedCount, detecting, openImportPrompt } =
		usePdfAcroformImportUi();

	const [addFieldsOpen, setAddFieldsOpen] = useState(true);

	const documentFieldCounts = useMemo(
		() => countFieldsByAssignee(currentDocumentFields, assignees),
		[currentDocumentFields, assignees],
	);

	const highlightedFieldType = useMemo(
		() => resolvePaletteHighlightedFieldType(selectedFieldIds, signatureFields),
		[selectedFieldIds, signatureFields],
	);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex-1 space-y-4 overflow-y-auto p-4">
				<Collapsible open={addFieldsOpen} onOpenChange={setAddFieldsOpen}>
					<CollapsibleTrigger
						render={
							<Button
								type="button"
								className="group/add-fields -mx-1 flex h-10 w-full cursor-pointer items-center justify-between rounded-md border-0 bg-transparent px-2 text-left transition-colors hover:bg-accent/50"
							/>
						}
					>
						<span className="flex items-center gap-2 text-sm font-medium text-foreground">
							<PenNibIcon
								className="size-4 text-muted-foreground"
								weight="regular"
							/>
							Add fields
						</span>
						<CaretDownIcon
							className={cn(
								"size-4 text-muted-foreground transition-transform duration-200",
								addFieldsOpen && "rotate-180",
							)}
							weight="bold"
						/>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3 space-y-4">
						<p className="text-xs text-muted-foreground">
							Pick a signer, then drag a field onto the page. Use Shift or
							⌘/Ctrl+click to multi-select; ⌘/Ctrl+drag on empty canvas to
							select several fields.
						</p>

						<ActiveAssigneeStrip
							activeAssigneeId={activeAssigneeId}
							onSelect={setActiveAssigneeId}
							fieldCountsByAssigneeId={documentFieldCounts}
						/>

						<PlacementFieldPaletteList
							isPlacingField={isPlacingField}
							pendingFieldType={pendingFieldType}
							highlightedFieldType={highlightedFieldType}
							selectedFieldCount={selectedFieldIds.size}
							placementFieldTypeLabel={placementFieldTypeLabel}
							onPaletteTypeClick={handlePaletteTypeClick}
							onCancelPlacement={cancelPlacement}
						/>
					</CollapsibleContent>
				</Collapsible>
			</div>

			<div className="hidden shrink-0 space-y-2 border-t border-border p-3 lg:block">
				<PlacedFieldsSheet variant="sidebar" />
				{canImportAcroform ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
						disabled={detecting}
						onClick={openImportPrompt}
					>
						<FilePdfIcon className="size-3.5 shrink-0" weight="regular" />
						<span className="text-left">
							{detecting
								? "Scanning PDF form fields…"
								: `Import ${detectedCount} PDF form field${detectedCount === 1 ? "" : "s"}`}
						</span>
					</Button>
				) : null}
			</div>
		</div>
	);
}
