import type { MySupplementaryPacketRow } from "@filosign/react/files";
import {
	triggerBrowserFileDownload,
	useDownloadSupplementaryPacket,
} from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import {
	ATTACHMENT_DOWNLOAD_DISCLAIMER_DESCRIPTION,
	ATTACHMENT_DOWNLOAD_DISCLAIMER_TITLE,
} from "@filosign/shared";
import { PaperclipIcon } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { showAppErrorToast } from "@/src/lib/errors";
import { safeAsync } from "@/src/lib/utils/safe";
import { SupplementaryPacketSignRow } from "@/src/routes/dashboard/document/sign/-components/supplementary-packet-sign-row";

type SupplementaryPacketsSignListProps = {
	pieceCid: string;
	packets: MySupplementaryPacketRow[];
};

export function SupplementaryPacketsSignList({
	pieceCid,
	packets,
}: SupplementaryPacketsSignListProps) {
	const { data: profile } = useUserProfile();
	const downloadPacket = useDownloadSupplementaryPacket();
	const [downloadingPacketId, setDownloadingPacketId] = useState<string | null>(
		null,
	);
	const [pendingPacket, setPendingPacket] =
		useState<MySupplementaryPacketRow | null>(null);

	const executeDownload = useCallback(
		async (packet: MySupplementaryPacketRow) => {
			if (!packet.unlocked) return;
			if (!packet.canDecrypt) {
				toastUser.error(TOASTS.sign.supplementaryDownloadSignIn.title, {
					hint: TOASTS.sign.supplementaryDownloadSignIn.hint,
				});
				return;
			}

			const profileEmail = profile?.email?.trim();
			if (!profileEmail) {
				toastUser.error(TOASTS.sign.supplementaryDownloadEmail.title, {
					hint: TOASTS.sign.supplementaryDownloadEmail.hint,
				});
				return;
			}

			setDownloadingPacketId(packet.packetId);
			const [result, err] = await safeAsync(() =>
				downloadPacket.mutateAsync({
					pieceCid,
					packetId: packet.packetId,
					recipientEmail: profileEmail,
				}),
			);
			setDownloadingPacketId(null);

			if (err) {
				showAppErrorToast(err);
				return;
			}

			for (const file of result.files) {
				triggerBrowserFileDownload(file);
			}
			toastUser.success(
				TOASTS.sign.supplementaryDownloading(result.files.length),
			);
		},
		[downloadPacket, pieceCid, profile?.email],
	);

	const requestDownload = useCallback((packet: MySupplementaryPacketRow) => {
		if (!packet.unlocked) return;
		setPendingPacket(packet);
	}, []);

	return (
		<div className="space-y-2 rounded-lg border border-border/60 p-3">
			<div className="space-y-1">
				<p className="flex items-center gap-1.5 text-xs font-medium">
					<PaperclipIcon className="size-3.5" weight="regular" />
					Attached file packets
				</p>
				<p className="text-[11px] leading-snug text-muted-foreground">
					Only you can see packets shared with your email on this envelope.
				</p>
			</div>
			<ul className="space-y-2">
				{packets.map((packet) => (
					<SupplementaryPacketSignRow
						key={packet.packetId}
						packet={packet}
						isDownloading={downloadingPacketId === packet.packetId}
						onDownload={requestDownload}
					/>
				))}
			</ul>
			<ConfirmAlertDialog
				open={pendingPacket !== null}
				onOpenChange={(open) => {
					if (!open) setPendingPacket(null);
				}}
				title={ATTACHMENT_DOWNLOAD_DISCLAIMER_TITLE}
				description={ATTACHMENT_DOWNLOAD_DISCLAIMER_DESCRIPTION}
				confirmLabel="Download"
				pending={downloadPacket.isPending}
				onConfirm={async () => {
					if (!pendingPacket) return;
					const packet = pendingPacket;
					setPendingPacket(null);
					await executeDownload(packet);
				}}
			/>
		</div>
	);
}
