import { createTelegramTransport } from "@filosign/logger";
import type { FeedbackFeatureArea, FeedbackPromptType } from "@filosign/shared";
import env from "@/env";

export async function notifyFeedbackSubmitted(args: {
	walletAddress: string;
	featureArea: FeedbackFeatureArea;
	promptType: FeedbackPromptType;
	rating: number | null;
	message: string | null;
	route: string | null;
	trigger: string | null;
}): Promise<void> {
	if (!env.TG_ANALYTICS) return;

	const transport = createTelegramTransport({
		enabled: true,
		botToken: env.TG_ANALYTICS_BOT_TOKEN,
		chatId: env.TG_ANALYTICS_BOT_GROUP_ID,
	});

	const ratingLabel = args.rating != null ? `${args.rating}/5` : "No rating";
	const messagePreview = args.message?.trim()
		? args.message.trim().slice(0, 280)
		: "No message";

	await transport.send({
		name: "product.feedback_submitted",
		severity: "error",
		message: `Feedback (${args.promptType}) · ${args.featureArea} · ${ratingLabel}`,
		context: {
			wallet: args.walletAddress,
			featureArea: args.featureArea,
			promptType: args.promptType,
			trigger: args.trigger,
			route: args.route,
			rating: args.rating,
			message: messagePreview,
		},
		timestamp: Date.now(),
	});
}
