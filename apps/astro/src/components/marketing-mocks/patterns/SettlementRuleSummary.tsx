import { LockKeyIcon } from "@phosphor-icons/react";
import MockBadge from "../kit/MockBadge";
import MockRow from "../kit/MockRow";

type SettlementRuleSummaryProps = {
	amount?: string;
	condition?: string;
	status?: string;
};

export default function SettlementRuleSummary({
	amount = "$500 payout",
	condition = "When all parties sign",
	status = "Ready",
}: SettlementRuleSummaryProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<div className="font-manrope text-xs text-muted-foreground">
						Payout rule
					</div>
					<div className="font-manrope text-lg font-medium text-primary">
						{amount}
					</div>
				</div>
				<MockBadge>{status}</MockBadge>
			</div>
			<MockRow className="gap-2 px-3 py-2" radius="lg">
				<LockKeyIcon
					className="size-4 text-primary"
					weight="fill"
					aria-hidden
				/>
				<span className="font-manrope text-xs">{condition}</span>
			</MockRow>
		</div>
	);
}
