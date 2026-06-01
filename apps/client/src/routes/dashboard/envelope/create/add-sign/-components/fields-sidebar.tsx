import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import { ComposeSettlementOptionsField } from "@/src/routes/dashboard/envelope/create/-components/compose-routing-field";
import { ActiveAssigneeStrip } from "@/src/routes/dashboard/envelope/create/add-sign/-components/active-assignee-strip";
import { paletteDraggableId } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-dnd-provider";
import { SupplementaryPacketsReview } from "@/src/routes/dashboard/envelope/create/add-sign/-components/supplementary-packets-review";
import { useAddSignPlacement } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
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
		currentPageFields,
		selectedField,
		selectedFieldIds,
		handleFieldSelect,
		focusFieldOnCanvas,
		handleRepeatFieldOnAllPages,
		pdfNumPages,
	} = useAddSignPlacement();

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex-1 space-y-4 overflow-y-auto p-4">
				<div>
					<p className="mb-2 font-medium text-muted-foreground">
						Standard Fields
					</p>
					<p className="mb-4 text-xs text-muted-foreground">
						Pick a signer, then drag a field onto the page.
					</p>
				</div>

				<ActiveAssigneeStrip
					activeAssigneeId={activeAssigneeId}
					onSelect={setActiveAssigneeId}
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

				{currentPageFields.length > 0 ? (
					<div className="space-y-2 border-t border-border pt-4">
						<p className="text-xs font-medium text-muted-foreground">
							On this page: {currentPageFields.length}{" "}
							{currentPageFields.length === 1 ? "field" : "fields"}
						</p>
						<ul className="space-y-1">
							{currentPageFields.map((field) => (
								<li key={field.id}>
									<button
										type="button"
										className={cn(
											"w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-muted/50",
											selectedFieldIds.has(field.id) && "bg-accent font-medium",
										)}
										onClick={() => {
											handleFieldSelect(field.id);
											focusFieldOnCanvas(field.id);
										}}
									>
										{field.type} · {field.assignedSignerEmail}
									</button>
									{selectedField === field.id &&
									pdfNumPages != null &&
									pdfNumPages > 1 ? (
										<button
											type="button"
											className="mt-0.5 w-full rounded px-2 py-0.5 text-left text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
											onClick={() => handleRepeatFieldOnAllPages(field.id)}
										>
											Repeat on all pages
										</button>
									) : null}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>

			<div className="flex shrink-0 flex-col gap-4 border-t border-border p-4">
				<SupplementaryPacketsReview />
				<ComposeSettlementOptionsField />
			</div>
		</div>
	);
}
