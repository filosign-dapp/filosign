import { useMemo } from "react";
import { DraftReview } from "@/src/routes/draft/review/-components/ui";
import { useDraftReviewController } from "@/src/routes/draft/review/-lib/hooks/use-controller";

export function DraftReviewPage({ token }: { token: string }) {
	const controller = useDraftReviewController(token);

	const value = useMemo(
		() => ({
			controller,
		}),
		[controller],
	);

	if (!token.trim()) {
		return (
			<div className="flex min-h-screen items-center justify-center p-8">
				<p className="max-w-md text-center text-sm text-destructive">
					Missing review link. Open the link from your email invitation.
				</p>
			</div>
		);
	}

	return (
		<DraftReview.Root value={value}>
			<DraftReview.Shell />
		</DraftReview.Root>
	);
}
