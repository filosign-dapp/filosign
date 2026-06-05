import { CheckCircleIcon } from "@phosphor-icons/react";
import MockAvatar from "../../kit/MockAvatar";
import MockChecklistRow from "../../kit/MockChecklistRow";
import MockPanel from "../../kit/MockPanel";
import { mockPersonas } from "../../tokens";

const checklistItems = [
	`${mockPersonas.bob.name} signed acceptance`,
	"Payout packet ready",
	"Payment sends automatically",
] as const;

export default function SignAndSettleMock() {
	return (
		<MockPanel variant="auto">
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<MockAvatar initial={mockPersonas.bob.name[0] ?? "B"} />
					<div>
						<div className="font-manrope text-sm font-semibold text-foreground">
							Payment follow-up
						</div>
						<div className="font-manrope text-xs text-muted-foreground">
							$4,200 payout packet
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="font-manrope text-sm font-medium text-muted-foreground">
						Ready
					</div>
					<div className="mt-1 font-manrope text-2xl text-primary">100%</div>
				</div>
			</div>
			<div className="space-y-3">
				{checklistItems.map((item) => (
					<MockChecklistRow
						key={item}
						icon={
							<CheckCircleIcon
								className="size-5 text-primary"
								weight="bold"
								aria-hidden
							/>
						}
					>
						{item}
					</MockChecklistRow>
				))}
			</div>
		</MockPanel>
	);
}
