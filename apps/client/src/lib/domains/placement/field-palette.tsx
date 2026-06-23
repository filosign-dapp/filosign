import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { signatureFieldPalette } from "@/src/lib/domains/placement/utils/field-types";
import { paletteDraggableId } from "@/src/lib/domains/placement/utils/placement-coordinates";
import { cn } from "@/src/lib/utils/utils";

type SignatureFieldType = SignatureField["type"];

type PaletteField = (typeof signatureFieldPalette)[number];

function paletteTypeLabel(type: SignatureFieldType): string {
	return signatureFieldPalette.find((row) => row.type === type)?.label ?? type;
}

export type PlacementPaletteTypeClickArgs = {
	isPlacingField: boolean;
	highlightedFieldType?: SignatureFieldType | null;
	selectedFieldCount?: number;
	onPaletteTypeClick: (type: SignatureFieldType) => void;
};

export function usePlacementPaletteTypeClicks({
	isPlacingField,
	highlightedFieldType,
	selectedFieldCount = 0,
	onPaletteTypeClick,
}: PlacementPaletteTypeClickArgs) {
	const [changeTypeDialogOpen, setChangeTypeDialogOpen] = useState(false);
	const [pendingTypeChange, setPendingTypeChange] =
		useState<SignatureFieldType | null>(null);

	const isEditingSingleField =
		selectedFieldCount === 1 &&
		Boolean(highlightedFieldType) &&
		!isPlacingField;
	const isEditingMultipleFields = selectedFieldCount > 1 && !isPlacingField;
	const isEditingSelectedFields =
		isEditingSingleField || isEditingMultipleFields;

	const handlePaletteItemClick = useCallback(
		(type: SignatureFieldType) => {
			if (isEditingSelectedFields) {
				if (highlightedFieldType && type === highlightedFieldType) return;
				setPendingTypeChange(type);
				setChangeTypeDialogOpen(true);
				return;
			}
			onPaletteTypeClick(type);
		},
		[highlightedFieldType, isEditingSelectedFields, onPaletteTypeClick],
	);

	const confirmTypeChange = useCallback(() => {
		if (!pendingTypeChange) return;
		onPaletteTypeClick(pendingTypeChange);
		setPendingTypeChange(null);
	}, [onPaletteTypeClick, pendingTypeChange]);

	const changeTypeDialogDescription = (() => {
		if (!pendingTypeChange) {
			return "Change the selected field type? Position and size stay the same.";
		}
		if (isEditingMultipleFields) {
			return `Do you want to change all the selected fields to ${paletteTypeLabel(pendingTypeChange)}? Position and size stay the same.`;
		}
		if (highlightedFieldType) {
			return `Change the selected field from ${paletteTypeLabel(highlightedFieldType)} to ${paletteTypeLabel(pendingTypeChange)}? Position and size stay the same.`;
		}
		return "Change the selected field type? Position and size stay the same.";
	})();

	const changeTypeDialog = (
		<ConfirmAlertDialog
			open={changeTypeDialogOpen}
			onOpenChange={(open) => {
				setChangeTypeDialogOpen(open);
				if (!open) setPendingTypeChange(null);
			}}
			title={
				isEditingMultipleFields
					? "Change all field types?"
					: "Change field type?"
			}
			description={changeTypeDialogDescription}
			confirmLabel={isEditingMultipleFields ? "Change all" : "Change type"}
			onConfirm={confirmTypeChange}
		/>
	);

	const selectionHint = isEditingMultipleFields ? (
		<p className="mt-2 text-xs leading-normal text-muted-foreground">
			You have selected multiple fields on the page. Choose a type to change
			them all (not add new fields). Use arrow keys to nudge position. Click
			empty canvas to deselect.
		</p>
	) : isEditingSingleField && highlightedFieldType ? (
		<p className="mt-2 text-xs leading-normal text-muted-foreground">
			A field is selected on the page. The highlighted type is that field.
			Choose another type to change it (not add a new field). Use arrow keys to
			nudge position. Click empty canvas to deselect.
		</p>
	) : null;

	return {
		handlePaletteItemClick,
		changeTypeDialog,
		selectionHint,
	};
}

function DraggableFieldPaletteItem({
	field,
	index,
	draggableScope,
	isPlacingField,
	pendingFieldType,
	highlightedFieldType,
	onPaletteTypeClick,
}: {
	field: PaletteField;
	index: number;
	draggableScope: "sidebar" | "mobile";
	isPlacingField: boolean;
	pendingFieldType: string | null | undefined;
	highlightedFieldType?: SignatureFieldType | null;
	onPaletteTypeClick: (type: SignatureFieldType) => void;
}) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: paletteDraggableId(field.type, draggableScope),
	});

	const IconComponent = field.icon;
	const isActive =
		(isPlacingField && pendingFieldType === field.type) ||
		highlightedFieldType === field.type;

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
				onClick={() => onPaletteTypeClick(field.type)}
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
	highlightedFieldType?: SignatureFieldType | null;
	selectedFieldCount?: number;
	placementFieldTypeLabel: string;
	onPaletteTypeClick: (type: SignatureFieldType) => void;
	onCancelPlacement?: () => void;
};

export function PlacementFieldPaletteList({
	draggableScope = "sidebar",
	isPlacingField,
	pendingFieldType,
	highlightedFieldType,
	selectedFieldCount = 0,
	placementFieldTypeLabel,
	onPaletteTypeClick,
	onCancelPlacement,
}: PlacementFieldPaletteListProps) {
	const { handlePaletteItemClick, changeTypeDialog, selectionHint } =
		usePlacementPaletteTypeClicks({
			isPlacingField,
			highlightedFieldType,
			selectedFieldCount,
			onPaletteTypeClick,
		});

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
						highlightedFieldType={highlightedFieldType}
						onPaletteTypeClick={handlePaletteItemClick}
					/>
				))}
			</div>
			{isPlacingField ? (
				<div className="mt-2 space-y-2">
					<div className="rounded border border-primary/20 bg-primary/5 p-2 text-xs text-primary">
						Click the page to place {placementFieldTypeLabel}
					</div>
					{onCancelPlacement ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 w-full text-xs"
							onClick={onCancelPlacement}
						>
							Cancel Placing Field
						</Button>
					) : null}
				</div>
			) : null}
			{selectionHint}
			{changeTypeDialog}
		</>
	);
}
