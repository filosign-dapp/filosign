import { useDraggable } from "@dnd-kit/core";
import { CaretDownIcon, PenNibIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { cn } from "@/src/lib/utils/utils";
import { ActiveAssigneeStrip } from "@/src/routes/dashboard/envelope/create/add-sign/-components/active-assignee-strip";
import { PlacedFieldsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-sheet";
import { SupplementaryPacketsReview } from "@/src/routes/dashboard/envelope/create/add-sign/-components/supplementary-packets-review";
import { useAddSignPlacement } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { paletteDraggableId } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-dnd-context";
import { countFieldsByAssignee } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/active-assignees";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";

function DraggablePaletteItem({
	field,
	index,
	isPlacingField,
	pendingFieldType,
	onAddField,
}: {
	field: (typeof signatureFieldPalette)[number];
	index: number;
	isPlacingField: boolean;
	pendingFieldType: string | null | undefined;
	onAddField: (type: (typeof signatureFieldPalette)[number]["type"]) => void;
}) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: paletteDraggableId(field.type, "sidebar"),
	});

	const IconComponent = field.icon;
	const isActive = isPlacingField && pendingFieldType === field.type;

	return (
		<motion.div
			ref={setNodeRef}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{
				duration: 0.15,
				delay: index * 0.02,
			}}
			{...listeners}
			{...attributes}
		>
			<Button
				type="button"
				variant="ghost"
				className={cn(
					"h-auto w-full justify-start p-3 transition-colors duration-100 touch-none hover:bg-muted/50",
					isActive && "border bg-accent",
				)}
				onClick={() => onAddField(field.type)}
			>
				<div className="flex w-full items-center gap-3">
					<div className="rounded-md bg-muted/30 p-2">
						<IconComponent className="size-6 text-primary" weight="regular" />
					</div>
					<div className="flex-1 text-left">
						<div className="text-sm font-medium">{field.label}</div>
						<div className="text-xs text-muted-foreground">
							{field.description}
						</div>
					</div>
				</div>
			</Button>
		</motion.div>
	);
}

export default function SignatureFieldsSidebar() {
	const {
		handleAddField,
		isPlacingField,
		pendingFieldType,
		placementFieldTypeLabel,
		activeAssigneeId,
		setActiveAssigneeId,
		assignees,
		currentDocumentFields,
	} = useAddSignPlacement();

	const [addFieldsOpen, setAddFieldsOpen] = useState(true);

	const documentFieldCounts = useMemo(
		() => countFieldsByAssignee(currentDocumentFields, assignees),
		[currentDocumentFields, assignees],
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
							Pick a signer, then drag a field onto the page.
						</p>

						<ActiveAssigneeStrip
							activeAssigneeId={activeAssigneeId}
							onSelect={setActiveAssigneeId}
							fieldCountsByAssigneeId={documentFieldCounts}
						/>

						<div className="space-y-2">
							{signatureFieldPalette.map((field, index) => (
								<DraggablePaletteItem
									key={field.type}
									field={field}
									index={index}
									isPlacingField={isPlacingField}
									pendingFieldType={pendingFieldType}
									onAddField={handleAddField}
								/>
							))}
						</div>

						{isPlacingField ? (
							<div className="rounded border border-primary/20 bg-primary/5 p-2 text-xs text-primary">
								Click the page to place {placementFieldTypeLabel}
							</div>
						) : null}
					</CollapsibleContent>
				</Collapsible>

				<div className="hidden lg:block">
					<PlacedFieldsSheet variant="sidebar" />
				</div>
			</div>

			<div className="flex shrink-0 flex-col gap-4 border-t border-border p-4">
				<SupplementaryPacketsReview />
			</div>
		</div>
	);
}
