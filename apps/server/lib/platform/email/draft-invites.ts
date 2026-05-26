import type { Address } from "viem";
import { sendDocumentSharedEmail } from "@/lib/platform/email/invites";
import { getClientUrl } from "@/lib/platform/email/public-url";

export async function sendDraftReviewInviteEmail(args: {
	to: string;
	senderWallet: Address;
	senderName?: string | null;
	draftId: string;
	draftTitle: string;
	inviteToken: string;
	accessKind: "warm" | "cold";
}) {
	const appUrl = getClientUrl();
	const reviewUrl = new URL("/draft/review", appUrl);
	reviewUrl.searchParams.set("token", args.inviteToken);

	await sendDocumentSharedEmail({
		to: args.to,
		senderWallet: args.senderWallet,
		pieceCid: args.draftId,
		senderName: args.senderName,
		variant: args.accessKind === "cold" ? "cold" : "warm",
		ctaHref: reviewUrl.toString(),
		idempotencyPrefix: "draft-review-invite",
		idempotencyExtra: [args.inviteToken, args.accessKind],
	});
}
