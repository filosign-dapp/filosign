import { createFileRoute } from "@tanstack/react-router";
import { DraftReviewPage } from "@/src/routes/draft/review/-components/page";

export const Route = createFileRoute("/draft/review/")({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === "string" ? search.token : "",
	}),
	component: function DraftReviewRoute() {
		const { token } = Route.useSearch();
		return <DraftReviewPage token={token} />;
	},
});
