import { z } from "zod";
import { zDateWire } from "./rpc-wire";

export const rpcSharingEmailInvitesOutputSchema = z.object({
	invites: z.array(
		z.object({
			id: z.string().uuid(),
			inviteeEmail: z.string(),
			message: z.string().nullable(),
			accepted: z.boolean(),
			createdAt: zDateWire,
		}),
	),
});

export const rpcSharingInviteByIdOutputSchema = z.object({
	id: z.string().uuid(),
	inviteeEmail: z.string(),
	message: z.string().nullable(),
	createdAt: zDateWire,
	senderName: z.string(),
});

const userInviteRowSchema = z.object({
	id: z.string().uuid(),
	sender: z.string(),
	inviteeEmail: z.string(),
	accepted: z.boolean(),
	message: z.string().nullable(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
	deletedAt: zDateWire.optional().nullable(),
});

export const rpcSharingInviteClaimOutputSchema = userInviteRowSchema;

export const rpcSharingRequestInviteOutputSchema = z.union([
	z.object({
		invited: z.literal(true),
		alreadyInvited: z.literal(true),
	}),
	z.object({ invited: z.literal(true) }),
]);
