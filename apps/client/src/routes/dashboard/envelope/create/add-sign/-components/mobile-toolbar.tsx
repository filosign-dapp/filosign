import { useDraggable } from "@dnd-kit/core";
import { PackageIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import {
	type DocumentListRailItem,
	DocumentSwitcherSheet,
} from "@/src/lib/domains/files/document-viewport";
import {
	useAddSignChrome,
	useAddSignPlacement,
} from "@/src/lib/domains/placement/context";
import { signatureFieldPalette } from "@/src/lib/domains/placement/utils/field-types";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import { SupplementaryPacketsSidebar } from "@/src/routes/dashboard/envelope/create/add-sign/-components/supplementary-packets-review";
import { paletteDraggableId } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-dnd-context";

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
	const {
		documents,
		currentDocumentId,
		handleDocumentSelect,
		signatureFields,
	} = useAddSignChrome();
	const createForm = useStorePersist((s) => s.createForm);
	const packetCount = createForm?.attachmentPacketDrafts?.length ?? 0;

	const railDocuments = useMemo((): DocumentListRailItem[] => {
		const fieldCountByDoc = new Map<string, number>();
		for (const field of signatureFields) {
			fieldCountByDoc.set(
				field.documentId,
				(fieldCountByDoc.get(field.documentId) ?? 0) + 1,
			);
		}
		return documents.map((doc) => ({
			id: doc.id,
			name: doc.name,
			fieldCount: fieldCountByDoc.get(doc.id) ?? 0,
		}));
	}, [documents, signatureFields]);

	return (
		<motion.div
			className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4 lg:hidden"
			initial={{ opacity: 0, y: 100 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				mass: 1.0,
			}}
		>
			<div className="mb-2 flex items-center justify-center gap-2">
				<DocumentSwitcherSheet
					documents={railDocuments}
					currentDocumentId={currentDocumentId}
					onDocumentSelect={handleDocumentSelect}
				/>
				{packetCount > 0 ? (
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
							<PackageIcon className="size-4" weight="duotone" />
							Packets
						</SheetTrigger>
						<SheetContent
							side="bottom"
							className="max-h-[70vh] overflow-y-auto px-4"
						>
							<SheetHeader>
								<SheetTitle>File packets</SheetTitle>
							</SheetHeader>
							<div className="mt-2">
								<SupplementaryPacketsSidebar />
							</div>
						</SheetContent>
					</Sheet>
				) : null}
			</div>
			<div className="glass rounded-large border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
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
