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
		<div className="min-w-0 space-y-3">
			<div className="flex min-w-0 items-center justify-between gap-2">
				<div className="min-w-0">
					<div className="font-manrope text-xs text-muted-foreground">
						Payout packet
					</div>
					<div className="truncate font-manrope text-lg font-medium text-primary">
						{amount}
					</div>
				</div>
				<MockBadge className="shrink-0">{status}</MockBadge>
			</div>
			<MockRow className="min-w-0 gap-2 px-3 py-2" radius="lg">
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
