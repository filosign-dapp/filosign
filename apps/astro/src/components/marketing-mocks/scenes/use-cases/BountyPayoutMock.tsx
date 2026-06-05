import { CurrencyDollarIcon } from "@phosphor-icons/react";
import MockBadge from "../../kit/MockBadge";
import MockPanel from "../../kit/MockPanel";
import MockRow from "../../kit/MockRow";

export default function BountyPayoutMock() {
	return (
		<MockPanel variant="compact" className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<CurrencyDollarIcon
						className="size-4 shrink-0 text-primary"
						aria-hidden
					/>
					<span className="truncate font-manrope text-sm font-medium">
						Bonus approved
					</span>
				</div>
				<MockBadge>Signed</MockBadge>
			</div>
			<MockRow className="justify-between gap-2 px-3 py-2" radius="lg">
				<span className="font-manrope text-xs text-muted-foreground">
					Payout packet
				</span>
				<span className="font-manrope text-sm font-medium text-primary">
					$2,500
				</span>
			</MockRow>
		</MockPanel>
	);
}
