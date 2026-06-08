import { z } from "zod";

export const zNotificationType = z.enum(["envelope_received"]);

export const zNotificationsInboxInputSchema = z.object({
	limit: z.number().int().min(1).max(50).optional(),
});

export const zNotificationsDismissInputSchema = z.object({
	id: z.string().min(1),
	type: zNotificationType,
});
