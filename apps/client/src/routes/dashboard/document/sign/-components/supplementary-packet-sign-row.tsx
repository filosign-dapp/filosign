import type { MySupplementaryPacketRow } from "@filosign/react/files";
import { DownloadSimpleIcon, KeyIcon, LockIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import {
	type SupplementaryPacketAccessState,
	supplementaryPacketAccessState,
	supplementaryPacketActionTitle,
	supplementaryPacketStatusLabel,
} from "@/src/lib/domains/files/supplementary-packet-sign-state";

type SupplementaryPacketSignRowProps = {
	packet: MySupplementaryPacketRow;
	isDownloading: boolean;
	onDownload: (packet: MySupplementaryPacketRow) => void;
};

function SupplementaryPacketAccessButton({
	access,
	isDownloading,
	onDownload,
}: {
	access: SupplementaryPacketAccessState;
	isDownloading: boolean;
	onDownload: () => void;
}) {
	const title = supplementaryPacketActionTitle(access);

	switch (access.status) {
		case "locked":
			return (
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					className="shrink-0"
					disabled
					title={title}
					aria-label={title}
				>
					<LockIcon className="size-3.5" weight="bold" />
				</Button>
			);
		case "awaiting_keys":
			return (
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					className="shrink-0"
					disabled
					title={title}
					aria-label={title}
				>
					<KeyIcon className="size-3.5" weight="bold" />
				</Button>
			);
		case "ready":
			return (
				<Button
					type="button"
					variant="default"
					size="icon-sm"
					className="shrink-0"
					disabled={isDownloading}
					title={title}
					aria-label={title}
					onClick={onDownload}
				>
					{isDownloading ? (
						<InlineLoader className="size-3.5" />
					) : (
						<DownloadSimpleIcon className="size-3.5" weight="bold" />
					)}
				</Button>
			);
	}
}

export function SupplementaryPacketSignRow({
	packet,
	isDownloading,
	onDownload,
}: SupplementaryPacketSignRowProps) {
	const access = supplementaryPacketAccessState(packet);
	const label = packet.label?.trim() || "Supplementary packet";

	return (
		<li className="flex items-start justify-between gap-2 rounded-md border border-border/40 bg-muted/10 px-2 py-2">
			<div className="min-w-0 flex-1 space-y-0.5">
				<p className="truncate text-xs font-medium">{label}</p>
				<p className="text-[11px] leading-snug text-muted-foreground">
					{supplementaryPacketStatusLabel(access)}
				</p>
			</div>
			<SupplementaryPacketAccessButton
				access={access}
				isDownloading={isDownloading}
				onDownload={() => onDownload(packet)}
			/>
		</li>
	);
}
