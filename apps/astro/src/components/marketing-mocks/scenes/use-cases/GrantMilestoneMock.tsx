import MockPanel from "../../kit/MockPanel";
import SettlementRuleSummary from "../../patterns/SettlementRuleSummary";

export default function GrantMilestoneMock() {
	return (
		<MockPanel variant="compact">
			<SettlementRuleSummary
				amount="$4,200 payment"
				condition="When client signs off"
				status="Ready"
			/>
		</MockPanel>
	);
}
