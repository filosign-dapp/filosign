import { useFilosignContext } from "@filosign/react";
import type { FileInfo } from "@filosign/react/files";
import { useAckFile } from "@filosign/react/files";
import {
	FILE_ACK_INTENT_LABELS,
	FILE_ACK_INTENT_VERSION_V1,
} from "@filosign/shared";
import { FileTextIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { invalidateInboxQueries } from "@/src/lib/query/invalidate-inbox";
import { NotificationItemCard } from "./notification-item-card";

type ReceivedFileNotificationProps = {
	pieceCid: string;
	sender: string;
	file?: FileInfo;
	setOpen: (open: boolean) => void;
	formatAddress: (address: string) => string;
};

export function ReceivedFileNotification({
	pieceCid,
	sender,
	file,
	setOpen,
	formatAddress,
}: ReceivedFileNotificationProps) {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const acknowledgeFile = useAckFile();
	const navigate = useNavigate();
	const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);

	const handleAcknowledge = async () => {
		try {
			await acknowledgeFile.mutateAsync({ pieceCid });
			await invalidateInboxQueries(queryClient, rpcQuery);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const handleOpenDocument = () => {
		navigate({
			to: "/dashboard/document/sign",
			search: { pieceCid },
		});
		setOpen(false);
	};

	const title = `File ${pieceCid.slice(0, 8)}...`;
	const subtitle = `From: ${formatAddress(sender)}`;

	if (!file) {
		return (
			<NotificationItemCard
				icon={<FileTextIcon className="h-4 w-4 text-primary" />}
				title={title}
				subtitle={subtitle}
				variant="info"
			/>
		);
	}

	const isAcknowledged = file.participantAccess?.acknowledged ?? false;

	return (
		<>
			<NotificationItemCard
				icon={<FileTextIcon className="h-4 w-4 text-primary" />}
				title={title}
				subtitle={subtitle}
				variant="info"
				actionButton={
					isAcknowledged
						? {
								label: "Open",
								onClick: handleOpenDocument,
								variant: "default",
							}
						: {
								label: "Accept",
								onClick: () => setAcceptDialogOpen(true),
								loading: acknowledgeFile.isPending,
								variant: "outline",
							}
				}
			/>
			<ConfirmAlertDialog
				open={acceptDialogOpen}
				onOpenChange={setAcceptDialogOpen}
				title="Accept document"
				description={FILE_ACK_INTENT_LABELS[FILE_ACK_INTENT_VERSION_V1]}
				confirmLabel={
					acknowledgeFile.isPending ? "Accepting…" : "Accept document"
				}
				pending={acknowledgeFile.isPending}
				onConfirm={handleAcknowledge}
			/>
		</>
	);
}
