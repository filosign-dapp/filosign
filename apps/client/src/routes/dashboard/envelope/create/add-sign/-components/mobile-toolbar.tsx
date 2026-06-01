import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils/utils";
import { paletteDraggableId } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-dnd-provider";
import { useAddSignPlacement } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";

function DraggableMobilePaletteButton({
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
		id: paletteDraggableId(field.type, "mobile"),
	});

	const IconComponent = field.icon;

	return (
		<motion.div
			ref={setNodeRef}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				delay: index * 0.05,
			}}
			className="flex-1"
			{...listeners}
			{...attributes}
		>
			<button
				type="button"
				className={cn(
					"w-full aspect-square p-2 transition-all duration-200 active:scale-95 active:bg-secondary/50 rounded-main touch-manipulation",
					"hover:scale-105 hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
					isPlacingField &&
						pendingFieldType === field.type &&
						"bg-secondary border border-primary/20 scale-105",
				)}
				onClick={() => onAddField(field.type)}
				aria-label={`Add ${field.type} field`}
			>
				<IconComponent
					className="size-6 text-secondary-foreground"
					weight="fill"
				/>
			</button>
		</motion.div>
	);
}

export default function MobileSignatureToolbar() {
	const { handleAddField, isPlacingField, pendingFieldType } =
		useAddSignPlacement();

	return (
		<motion.div
			className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 lg:hidden w-full max-w-md px-4"
			initial={{ opacity: 0, y: 100 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				mass: 1.0,
			}}
		>
			<div className="glass bg-background/95 border border-border rounded-large p-4 shadow-lg backdrop-blur-sm">
				<p className="mb-2 text-center text-[10px] text-muted-foreground">
					Drag onto the page
				</p>
				<div className="flex items-center justify-center gap-1">
					{signatureFieldPalette.map((field, index) => (
						<DraggableMobilePaletteButton
							key={field.type}
							field={field}
							index={index}
							isPlacingField={isPlacingField}
							pendingFieldType={pendingFieldType}
							onAddField={handleAddField}
						/>
					))}
				</div>
			</div>
		</motion.div>
	);
}
