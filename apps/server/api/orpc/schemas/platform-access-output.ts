import { z } from "zod";
import { rpcBillingPartnerInviteTrialSchema } from "./billing-output";

export const rpcPlatformAccessRedeemPartnerInviteInputSchema = z.object({
	platformInviteToken: z.string().min(8),
	organizationId: z.uuid().optional(),
});

export const rpcPlatformAccessRedeemPartnerInviteOutputSchema = z.object({
	applied: z.boolean(),
	organizationId: z.uuid().nullable(),
	partnerInviteTrial: rpcBillingPartnerInviteTrialSchema.nullable(),
});
