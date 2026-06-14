import { zFeedbackFeatureArea, zFeedbackPromptType } from "@filosign/shared";
import type { Address } from "viem";
import { z } from "zod";
import type { zPlatformAdminFeedbackListInput } from "@/api/orpc/schemas/platform-admin-output";
import {
	listProductFeedbackForAdmin,
	submitProductFeedback,
} from "@/lib/domains/feedback";
import { assertPlatformAdmin } from "@/lib/platform/admin";

export const zFeedbackSubmitOutput = z.object({
	ok: z.literal(true),
	submittedAt: z.iso.datetime(),
});

export const zFeedbackSubmitInput = z.object({
	featureArea: zFeedbackFeatureArea,
	route: z.string().max(500).nullable().optional(),
	rating: z.number().int().min(1).max(5).nullable().optional(),
	message: z
		.string()
		.trim()
		.min(1, { error: "Notes are required." })
		.max(500, { error: "Notes must be 500 characters or fewer." }),
	pieceCid: z.string().max(200).nullable().optional(),
	promptType: zFeedbackPromptType.default("global"),
	trigger: z.string().max(120).nullable().optional(),
	organizationId: z.uuid().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type FeedbackSubmitInput = z.infer<typeof zFeedbackSubmitInput>;

export type PlatformAdminFeedbackListInput = z.infer<
	typeof zPlatformAdminFeedbackListInput
>;

export async function platformAdminFeedbackList(
	adminWallet: Address,
	input: PlatformAdminFeedbackListInput,
) {
	await assertPlatformAdmin(adminWallet);
	return listProductFeedbackForAdmin(input.page);
}

export async function feedbackSubmit(
	walletAddress: Address,
	input: FeedbackSubmitInput,
) {
	return submitProductFeedback({
		walletAddress,
		organizationId: input.organizationId ?? null,
		featureArea: input.featureArea,
		route: input.route ?? null,
		rating: input.rating ?? null,
		message: input.message,
		pieceCid: input.pieceCid ?? null,
		promptType: input.promptType,
		trigger: input.trigger ?? null,
		metadata: input.metadata ?? {},
	});
}
