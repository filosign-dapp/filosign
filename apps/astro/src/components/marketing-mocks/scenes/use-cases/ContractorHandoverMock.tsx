import { CheckCircleIcon } from "@phosphor-icons/react";
import MockChecklistRow from "../../kit/MockChecklistRow";
import MockPanel from "../../kit/MockPanel";

const steps = ["Agreement signed", "Deliverables released"] as const;

export default function ContractorHandoverMock() {
	return (
		<MockPanel variant="compact" className="space-y-2.5">
			{steps.map((step) => (
				<MockChecklistRow
					key={step}
					icon={
						<CheckCircleIcon
							className="size-4 text-primary"
							weight="bold"
							aria-hidden
						/>
					}
				>
					{step}
				</MockChecklistRow>
			))}
		</MockPanel>
	);
}
