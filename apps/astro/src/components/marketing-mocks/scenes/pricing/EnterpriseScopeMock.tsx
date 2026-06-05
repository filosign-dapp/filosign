import {
	FileTextIcon,
	HeadsetIcon,
	ShieldCheckIcon,
	SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import MockBadge from "../../kit/MockBadge";
import MockChecklistRow from "../../kit/MockChecklistRow";
import MockPanel from "../../kit/MockPanel";

export default function EnterpriseScopeMock() {
	return (
		<MockPanel variant="auto" className="space-y-3 p-4">
			<div className="flex items-center justify-between gap-2">
				<span className="font-manrope text-xs font-medium text-muted-foreground">
					Enterprise scope
				</span>
				<MockBadge>Custom contract</MockBadge>
			</div>
			<div className="space-y-2">
				<MockChecklistRow
					icon={
						<SlidersHorizontalIcon
							className="size-4 shrink-0 text-primary"
							weight="bold"
							aria-hidden
						/>
					}
				>
					Custom sending limits and seats
				</MockChecklistRow>
				<MockChecklistRow
					icon={
						<ShieldCheckIcon
							className="size-4 shrink-0 text-primary"
							weight="fill"
							aria-hidden
						/>
					}
				>
					Security review and DPA support
				</MockChecklistRow>
				<MockChecklistRow
					icon={
						<HeadsetIcon
							className="size-4 shrink-0 text-primary"
							weight="fill"
							aria-hidden
						/>
					}
				>
					Dedicated support terms
				</MockChecklistRow>
				<MockChecklistRow
					icon={
						<FileTextIcon
							className="size-4 shrink-0 text-primary"
							weight="fill"
							aria-hidden
						/>
					}
				>
					Procurement-friendly agreement
				</MockChecklistRow>
			</div>
		</MockPanel>
	);
}
