import { CheckCircleIcon, FileIcon, LockKeyIcon } from "@phosphor-icons/react";
import MockBadge from "../../kit/MockBadge";
import MockPanel from "../../kit/MockPanel";
import MockRow from "../../kit/MockRow";

export default function AgencyDeliveryMock() {
	return (
		<MockPanel variant="compact" className="space-y-2.5">
			<div className="flex items-center justify-between gap-2">
				<span className="font-manrope text-xs font-medium text-muted-foreground">
					Gated files
				</span>
				<MockBadge>After sign-off</MockBadge>
			</div>
			<MockRow className="justify-between gap-2 px-3 py-2" radius="lg">
				<div className="flex min-w-0 items-center gap-2">
					<FileIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
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
			<MockRow className="justify-between gap-2 px-3 py-2" radius="lg">
				<div className="flex min-w-0 items-center gap-2">
					<CheckCircleIcon
						className="size-3.5 shrink-0 text-primary"
						weight="fill"
						aria-hidden
					/>
					<span className="truncate font-manrope text-xs">Client signed</span>
				</div>
				<span className="font-manrope text-[10px] text-primary">Unlocked</span>
			</MockRow>
		</MockPanel>
	);
}
