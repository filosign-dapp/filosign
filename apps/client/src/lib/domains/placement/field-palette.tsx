import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import { paletteDraggableId } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-dnd-context";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";

type SignatureFieldType = SignatureField["type"];

type PaletteField = (typeof signatureFieldPalette)[number];

function DraggableFieldPaletteItem({
	field,
	index,
	draggableScope,
	isPlacingField,
	pendingFieldType,
	onAddField,
}: {
	field: PaletteField;
	index: number;
	draggableScope: "sidebar" | "mobile";
	isPlacingField: boolean;
	pendingFieldType: string | null | undefined;
	onAddField: (type: SignatureFieldType) => void;
}) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: paletteDraggableId(field.type, draggableScope),
	});

	const IconComponent = field.icon;
	const isActive = isPlacingField && pendingFieldType === field.type;

	return (
		<motion.div
			ref={setNodeRef}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.15, delay: index * 0.02 }}
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

type PlacementFieldPaletteListProps = {
	draggableScope?: "sidebar" | "mobile";
	isPlacingField: boolean;
	pendingFieldType: string | null | undefined;
	placementFieldTypeLabel: string;
	onAddField: (type: SignatureFieldType) => void;
};

export function PlacementFieldPaletteList({
	draggableScope = "sidebar",
	isPlacingField,
	pendingFieldType,
	placementFieldTypeLabel,
	onAddField,
}: PlacementFieldPaletteListProps) {
	return (
		<>
			<div className="space-y-2">
				{signatureFieldPalette.map((field, index) => (
					<DraggableFieldPaletteItem
						key={field.type}
						field={field}
						index={index}
						draggableScope={draggableScope}
						isPlacingField={isPlacingField}
						pendingFieldType={pendingFieldType}
						onAddField={onAddField}
					/>
				))}
			</div>
			{isPlacingField ? (
				<div className="rounded border border-primary/20 bg-primary/5 p-2 text-xs text-primary">
					Click the page to place {placementFieldTypeLabel}
				</div>
			) : null}
		</>
	);
}
