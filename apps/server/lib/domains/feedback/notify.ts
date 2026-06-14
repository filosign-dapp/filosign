import type {
	FeedbackFeatureArea,
	FeedbackKind,
	FeedbackPromptType,
} from "@filosign/shared";
import { emitProductFeedbackPing } from "@/lib/platform/analytics";

export async function notifyFeedbackSubmitted(args: {
	walletAddress: string;
	organizationId: string | null;
	kind: FeedbackKind;
	featureArea: FeedbackFeatureArea;
	promptType: FeedbackPromptType;
	message: string;
	route: string | null;
	trigger: string | null;
	pieceCid: string | null;
}): Promise<void> {
	return emitProductFeedbackPing(args);
}
