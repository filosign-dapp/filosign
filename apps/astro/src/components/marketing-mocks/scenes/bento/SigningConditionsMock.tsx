import { LockKeyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import MockBadge from "../../kit/MockBadge";
import MockPanel from "../../kit/MockPanel";
import MockRow from "../../kit/MockRow";
import { mockPersonas } from "../../tokens";

export default function SigningConditionsMock() {
	return (
		<MockPanel variant="default" className="space-y-2.5">
			<div className="flex items-center justify-between gap-2">
				<span className="font-manrope text-xs font-medium text-muted-foreground">
					Release when
				</span>
				<MockBadge>Configurable</MockBadge>
			</div>
			<MockRow className="gap-2 px-3 py-2.5" radius="lg">
				<LockKeyIcon
					className="size-3.5 shrink-0 text-primary"
					weight="fill"
					aria-hidden
				/>
				<span className="truncate font-manrope text-xs">
					When {mockPersonas.bob.email} signs
				</span>
			</MockRow>
			<MockRow className="gap-2 px-3 py-2.5" radius="lg">
				<UsersThreeIcon
					className="size-3.5 shrink-0 text-primary"
					aria-hidden
				/>
				<span className="font-manrope text-xs">2 of 5 approvers signed</span>
			</MockRow>
		</MockPanel>
	);
}
