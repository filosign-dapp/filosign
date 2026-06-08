import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "@/src/lib/components/ui/button";

type ComposeRuleCardProps = {
	children: ReactNode;
	actions: ReactNode;
};

export function ComposeRuleCard({ children, actions }: ComposeRuleCardProps) {
	return (
		<li className="rounded-lg border border-border/50 bg-background/50 p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">{children}</div>
				<div className="flex shrink-0 items-center gap-1">{actions}</div>
			</div>
		</li>
	);
}

type ComposeRuleCardEditRemoveActionsProps = {
	onEdit: () => void;
	onRemove: () => void;
	editLabel: string;
	removeLabel: string;
};

export function ComposeRuleCardEditRemoveActions({
	onEdit,
	onRemove,
	editLabel,
	removeLabel,
}: ComposeRuleCardEditRemoveActionsProps) {
	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={onEdit}
				aria-label={editLabel}
			>
				<PencilSimpleIcon className="size-4" weight="regular" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={onRemove}
				aria-label={removeLabel}
			>
				<TrashIcon className="size-4" weight="regular" />
			</Button>
		</>
	);
}
