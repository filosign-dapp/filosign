import type { FeedbackFeatureArea, FeedbackPromptType } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq, gte } from "drizzle-orm";
import type { Address } from "viem";
import db from "@/lib/platform/db";
import { productFeedback } from "@/lib/platform/db/schema/feedback";
import { notifyFeedbackSubmitted } from "./notify";

const MAX_SUBMISSIONS_PER_HOUR = 10;

export async function submitProductFeedback(args: {
	walletAddress: Address;
	organizationId: string | null;
	featureArea: FeedbackFeatureArea;
	route: string | null;
	rating: number | null;
	message: string;
	pieceCid: string | null;
	promptType: FeedbackPromptType;
	trigger: string | null;
	metadata: Record<string, unknown>;
}): Promise<{ ok: true; submittedAt: string }> {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	const recentRows = await db
		.select({ id: productFeedback.id })
		.from(productFeedback)
		.where(
			and(
				eq(productFeedback.walletAddress, args.walletAddress),
				gte(productFeedback.createdAt, oneHourAgo),
			),
		)
		.limit(MAX_SUBMISSIONS_PER_HOUR);

	if (recentRows.length >= MAX_SUBMISSIONS_PER_HOUR) {
		throw new ORPCError("TOO_MANY_REQUESTS" /* error-audit-allow */, {
			message: "Too many feedback submissions. Try again later.",
		});
	}

	const trimmedMessage = args.message.trim();
	if (!trimmedMessage) {
		throw new ORPCError("BAD_REQUEST" /* error-audit-allow */, {
			message: "Notes are required.",
		});
	}
	if (trimmedMessage.length > 500) {
		throw new ORPCError("BAD_REQUEST" /* error-audit-allow */, {
			message: "Notes must be 500 characters or fewer.",
		});
	}

	if (
		args.rating != null &&
		(!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5)
	) {
		throw new ORPCError("BAD_REQUEST" /* error-audit-allow */, {
			message: "Rating must be between 1 and 5.",
		});
	}

	const submittedAt = new Date();

	await db.insert(productFeedback).values({
		walletAddress: args.walletAddress,
		organizationId: args.organizationId,
		featureArea: args.featureArea,
		route: args.route,
		rating: args.rating,
		message: trimmedMessage,
		pieceCid: args.pieceCid,
		promptType: args.promptType,
		trigger: args.trigger,
		metadata: args.metadata,
		createdAt: submittedAt,
		updatedAt: submittedAt,
	});

	void notifyFeedbackSubmitted({
		walletAddress: args.walletAddress,
		featureArea: args.featureArea,
		promptType: args.promptType,
		rating: args.rating,
		message: trimmedMessage,
		route: args.route,
		trigger: args.trigger,
	});

	return { ok: true, submittedAt: submittedAt.toISOString() };
}
