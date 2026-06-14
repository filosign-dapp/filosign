import { z } from "zod";

export const FEEDBACK_FEATURE_AREAS = [
	"send",
	"sign",
	"payouts",
	"exports",
	"workspace",
	"other",
] as const;

export type FeedbackFeatureArea = (typeof FEEDBACK_FEATURE_AREAS)[number];

export const zFeedbackFeatureArea = z.enum(FEEDBACK_FEATURE_AREAS);

export const FEEDBACK_PROMPT_TYPES = ["global", "contextual"] as const;

export type FeedbackPromptType = (typeof FEEDBACK_PROMPT_TYPES)[number];

export const zFeedbackPromptType = z.enum(FEEDBACK_PROMPT_TYPES);

export const FEEDBACK_KINDS = ["feedback", "bug", "support"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const zFeedbackKind = z.enum(FEEDBACK_KINDS);
