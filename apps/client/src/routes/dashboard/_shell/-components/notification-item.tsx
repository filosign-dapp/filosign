import type { NotificationInboxItem } from "@filosign/react/notifications";
import { useNotificationsDismiss } from "@filosign/react/notifications";
import { FileTextIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { NotificationItemCard } from "./notification-item-card";

export function NotificationItem(props: {
	item: NotificationInboxItem;
	setOpen: (open: boolean) => void;
}) {
	const navigate = useNavigate();
	const dismiss = useNotificationsDismiss();

	const handleOpen = () => {
		void navigate({
			to: "/dashboard/document/sign",
			search: { pieceCid: props.item.id },
		});
		props.setOpen(false);
	};

	const handleDismiss = () => {
		void dismiss.mutateAsync({
			type: props.item.type,
			id: props.item.id,
		});
	};

	return (
		<NotificationItemCard
			icon={<FileTextIcon className="h-4 w-4 text-primary" />}
			title={props.item.title}
			subtitle={props.item.subtitle}
			variant="info"
			primaryAction={{
				label: "Open",
				onClick: handleOpen,
			}}
			secondaryAction={{
				label: "Dismiss",
				onClick: handleDismiss,
				loading: dismiss.isPending,
			}}
		/>
	);
}
