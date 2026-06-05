import { CheckCircleIcon, FileIcon, LockKeyIcon } from "@phosphor-icons/react";
import MockBadge from "../../kit/MockBadge";
import MockPanel from "../../kit/MockPanel";
import MockRow from "../../kit/MockRow";
import { mockPersonas } from "../../tokens";

export default function GatedDeliverableMock() {
	return (
		<MockPanel variant="default" className="space-y-2.5">
			<div className="flex items-center justify-between gap-2">
				<span className="font-manrope text-xs font-medium text-muted-foreground">
					Extra files
				</span>
				<MockBadge>After acceptance</MockBadge>
			</div>
			<MockRow className="justify-between gap-2 px-3 py-2.5" radius="lg">
				<div className="flex min-w-0 items-center gap-2">
					<FileIcon className="size-4 shrink-0 text-primary" aria-hidden />
					<span className="truncate font-manrope text-xs">
						Final_deliverables.zip
					</span>
				</div>
				<LockKeyIcon
					className="size-3.5 shrink-0 text-muted-foreground"
					weight="fill"
					aria-hidden
				/>
			</MockRow>
			<MockRow className="justify-between gap-2 px-3 py-2.5" radius="lg">
				<div className="flex min-w-0 items-center gap-2">
					<CheckCircleIcon
						className="size-3.5 shrink-0 text-primary"
						weight="fill"
						aria-hidden
					/>
					<span className="truncate font-manrope text-xs">
						{mockPersonas.bob.name} signed
					</span>
				</div>
				<span className="font-manrope text-[10px] text-primary">Unlocked</span>
			</MockRow>
		</MockPanel>
	);
}
