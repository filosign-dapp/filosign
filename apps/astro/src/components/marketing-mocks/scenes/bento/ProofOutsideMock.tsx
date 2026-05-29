import { ShieldCheckIcon } from "@phosphor-icons/react";
import MockAvatar from "../../kit/MockAvatar";
import MockBadge from "../../kit/MockBadge";
import MockPanel from "../../kit/MockPanel";

export default function ProofOutsideMock() {
	return (
		<MockPanel variant="default" className="space-y-3.5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<ShieldCheckIcon
						className="size-5 text-primary"
						weight="fill"
						aria-hidden
					/>
					<span className="font-manrope text-sm font-medium">
						Verify anywhere
					</span>
				</div>
				<MockBadge>Yours to keep</MockBadge>
			</div>
			<div className="flex items-center justify-between opacity-40">
				<div className="flex items-center gap-3">
					<MockAvatar initial="V" variant="outline" size="xs" />
					<span className="font-manrope text-sm">Trapped in their app</span>
				</div>
				<MockBadge tone="muted">Locked in</MockBadge>
			</div>
			<div className="flex items-center justify-between pb-1 opacity-40">
				<div className="flex items-center gap-3">
					<MockAvatar initial="D" variant="outline" size="xs" />
					<span className="font-manrope text-sm">Email screenshots</span>
				</div>
				<MockBadge tone="muted">Manual</MockBadge>
			</div>
		</MockPanel>
	);
}
