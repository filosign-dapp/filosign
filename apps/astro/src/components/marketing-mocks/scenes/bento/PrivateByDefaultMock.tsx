import { LockKeyIcon } from "@phosphor-icons/react";
import MockPanel from "../../kit/MockPanel";

export default function PrivateByDefaultMock() {
	return (
		<MockPanel variant="default" className="items-center gap-4">
			<div className="rounded-lg bg-background p-2">
				<LockKeyIcon
					className="size-24 text-primary"
					weight="fill"
					aria-hidden
				/>
			</div>
			<div className="w-full">
				<div className="w-full rounded-lg bg-primary px-4 py-2.5 text-center font-manrope text-sm font-medium text-primary-foreground">
					Client-Side Encrypted
				</div>
			</div>
		</MockPanel>
	);
}
