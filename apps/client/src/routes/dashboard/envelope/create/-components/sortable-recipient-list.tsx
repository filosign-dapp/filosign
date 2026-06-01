import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { partitionRecipientsForTurnOrder } from "@/src/routes/dashboard/envelope/create/-lib/utils/routing-turn-order";
import { RecipientCard } from "./recipient-card";

type SortableSignerCardProps = {
	recipientIndex: number;
	turnIndex: number;
	sortableId: string;
};

function SortableSignerCard({
	recipientIndex,
	turnIndex,
	sortableId,
}: SortableSignerCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: sortableId });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<RecipientCard
				index={recipientIndex}
				turnIndex={turnIndex}
				dragHandleRef={setActivatorNodeRef}
				dragHandleListeners={listeners}
				dragHandleAttributes={attributes}
				isDragging={isDragging}
			/>
		</div>
	);
}

type SortableRecipientListProps = {
	recipients: Recipient[];
	routingOrderEmails: string[];
	onReorder: (fromIndex: number, toIndex: number) => void;
};

export function SortableRecipientList({
	recipients,
	routingOrderEmails,
	onReorder,
}: SortableRecipientListProps) {
	const { signers, viewers } = partitionRecipientsForTurnOrder(
		recipients,
		routingOrderEmails,
	);

	const sortableIds = signers.map(
		(row) => row.recipient.clientRowId ?? `signer-${row.index}`,
	);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const fromIndex = sortableIds.indexOf(String(active.id));
		const toIndex = sortableIds.indexOf(String(over.id));
		if (fromIndex === -1 || toIndex === -1) return;

		onReorder(fromIndex, toIndex);
	};

	return (
		<motion.div
			className="space-y-3"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 26,
				delay: 0.06,
			}}
		>
			{signers.length > 0 ? (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={sortableIds}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-0">
							{signers.map((row, signerIndex) => {
								const sortableId =
									row.recipient.clientRowId ?? `signer-${row.index}`;
								const showArrow = signerIndex < signers.length - 1;

								return (
									<div key={sortableId}>
										<SortableSignerCard
											recipientIndex={row.index}
											turnIndex={signerIndex + 1}
											sortableId={sortableId}
										/>
										{showArrow ? (
											<div
												className="flex justify-center py-1.5 text-muted-foreground/60"
												aria-hidden
											>
												<ArrowDownIcon className="size-4" weight="bold" />
											</div>
										) : null}
									</div>
								);
							})}
						</div>
					</SortableContext>
				</DndContext>
			) : null}

			{viewers.length > 0 ? (
				<div className="space-y-3">
					{viewers.map((row) => (
						<RecipientCard
							key={row.recipient.clientRowId ?? `viewer-${row.index}`}
							index={row.index}
						/>
					))}
				</div>
			) : null}
		</motion.div>
	);
}
