import { SignEnvelopeProgressBanner } from "@/src/routes/dashboard/document/sign/-components/envelope-progress";
import type { EnvelopeProgressLike } from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

export function SignSidebarEnvelopeProgress({
	progress,
	canSignByRouting,
}: {
	progress: EnvelopeProgressLike | null | undefined;
	canSignByRouting?: boolean;
}) {
	if (!progress) return null;

	return (
		<div className="rounded-large border border-border/50 bg-card p-4 shadow-sm ring-1 ring-foreground/5">
			<SignEnvelopeProgressBanner
				progress={progress}
				canSignByRouting={canSignByRouting}
			/>
		</div>
	);
}
