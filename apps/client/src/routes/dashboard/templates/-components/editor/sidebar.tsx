import { CaretDownIcon, PenNibIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { PlacementFieldPaletteList } from "@/src/lib/domains/placement/field-palette";
import { cn } from "@/src/lib/utils/utils";
import { PlacedFieldsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-sheet";
import { useAddSignPlacement } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { TemplateDefaultsPanel } from "./template-defaults-panel";
import { TemplateDocumentsPanel } from "./template-documents-panel";
import { TemplateRolesPanel } from "./template-roles-panel";

export function TemplateEditorSidebar() {
	const {
		handleAddField,
		isPlacingField,
		pendingFieldType,
		placementFieldTypeLabel,
		assignees,
		activeAssigneeId,
	} = useAddSignPlacement();
	const [addFieldsOpen, setAddFieldsOpen] = useState(true);

	const activeAssignee = assignees.find((row) => row.id === activeAssigneeId);
	const placementBlocked = activeAssignee && !activeAssignee.placementEnabled;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex-1 space-y-6 overflow-y-auto p-4">
				<TemplateRolesPanel />
				<TemplateDocumentsPanel />
				<TemplateDefaultsPanel />

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
							Select a signer role above, then drag a field onto the page.
						</p>
						{placementBlocked ? (
							<p className="rounded border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
								Viewer roles cannot receive fields. Select a signer role first.
							</p>
						) : null}
						<PlacementFieldPaletteList
							isPlacingField={isPlacingField}
							pendingFieldType={pendingFieldType}
							placementFieldTypeLabel={placementFieldTypeLabel}
							onAddField={handleAddField}
						/>
					</CollapsibleContent>
				</Collapsible>
			</div>

			<div className="hidden shrink-0 border-t border-border p-3 lg:block">
				<PlacedFieldsSheet variant="sidebar" />
			</div>
		</div>
	);
}
