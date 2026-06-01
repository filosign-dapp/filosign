import type { ErrorComponentProps } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { presentAppError } from "@/src/lib/errors/present-app-error";
import { reportClientError } from "@/src/lib/utils/report-client-error";
import { PageCrashed } from "./page-crashed";

/** TanStack Router `errorComponent` / `defaultErrorComponent`. */
export function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
	const navigate = useNavigate();

	if (error instanceof Error) {
		reportClientError(error, { source: "router" });
	}

	return (
		<div className="flex flex-1 flex-col gap-4 h-screen">
			<PageCrashed
				title={
					error instanceof Error
						? presentAppError(error).title
						: "Something went wrong"
				}
				description={
					error instanceof Error
						? presentAppError(error).description
						: "There was an error loading this page."
				}
				showRetryButton
				showBackButton
				showHomeButton={false}
				onRetry={() => reset()}
				onBack={() => navigate({ to: "/" })}
			/>
		</div>
	);
}
