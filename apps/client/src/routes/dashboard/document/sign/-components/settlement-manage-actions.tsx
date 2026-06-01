import type { SettlementRuleRow } from "@filosign/react/files";
import { Button } from "@/src/lib/components/ui/button";

type Props = {
	rule: SettlementRuleRow;
	onCancel: () => void;
	onUpdate: () => void;
	cancelPending?: boolean;
	updatePending?: boolean;
};

export function SettlementManageActions({
	onCancel,
	onUpdate,
	cancelPending,
	updatePending,
}: Props) {
	return (
		<div className="flex flex-wrap gap-2 mt-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-7 text-xs"
				disabled={updatePending || cancelPending}
				onClick={onUpdate}
			>
				{updatePending ? "Saving…" : "Change amounts"}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-7 text-xs text-destructive"
				disabled={cancelPending || updatePending}
				onClick={onCancel}
			>
				{cancelPending ? "Removing…" : "Remove payout"}
			</Button>
		</div>
	);
}
