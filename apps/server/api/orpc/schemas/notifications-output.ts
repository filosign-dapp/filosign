import { z } from "zod";
import { zNotificationType } from "./notifications-input";
import { zDateWire } from "./rpc-wire";

export const zNotificationInboxItemSchema = z.object({
	id: z.string(),
	type: zNotificationType,
	title: z.string(),
	subtitle: z.string(),
	createdAt: zDateWire,
	href: z.string(),
});

export const rpcNotificationsInboxOutputSchema = z.object({
	unreadCount: z.number().int().min(0),
	items: z.array(zNotificationInboxItemSchema),
});

export const rpcNotificationsDismissOutputSchema = z.object({
	ok: z.literal(true),
});
