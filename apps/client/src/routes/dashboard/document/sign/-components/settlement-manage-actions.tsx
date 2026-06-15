import type { SettlementRuleRow } from "@filosign/react/files";
import { Button } from "@/src/lib/components/ui/button";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";

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
				className="h-7 gap-1.5 text-xs"
				disabled={updatePending || cancelPending}
				onClick={onUpdate}
			>
				{updatePending ? "Updating…" : "Change amounts"}
				<ProFeatureMark size="xs" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-7 gap-1.5 text-xs text-destructive"
				disabled={cancelPending || updatePending}
				onClick={onCancel}
			>
				{cancelPending ? "Removing…" : "Remove payout"}
				<ProFeatureMark size="xs" />
			</Button>
		</div>
	);
}
