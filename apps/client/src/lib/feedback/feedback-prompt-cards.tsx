import { useId } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { FEEDBACK_COPY, FEEDBACK_IMAGES } from "@/src/lib/copy/feedback";
import { useFeedback } from "@/src/lib/feedback/feedback-provider";
import { FloatingPromptShell } from "@/src/lib/feedback/floating-prompt-shell";
import { snoozeFeedbackInvite } from "@/src/lib/feedback/prefs-storage";

export function FeedbackInviteCard() {
	const titleId = useId();
	const { openFeedback } = useFeedback();

	return (
		<FloatingPromptShell
			titleId={titleId}
			headerImage={FEEDBACK_IMAGES.inviteHeader}
			bodyBackdrop={FEEDBACK_IMAGES.inviteBody}
		>
			<div className="px-8 pb-8 pt-6 text-center">
				<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
					{FEEDBACK_COPY.invite.label}
				</p>
				<h2 id={titleId} className="mt-2 font-manrope text-2xl text-foreground">
					{FEEDBACK_COPY.invite.title}
				</h2>
				<p className="mx-auto mt-2 max-w-72 text-sm leading-relaxed text-muted-foreground">
					{FEEDBACK_COPY.invite.body}
				</p>
				<div className="mt-7 flex flex-col items-center gap-2.5">
					<Button
						type="button"
						variant="primary"
						size="sm"
						className="min-w-44 rounded-full"
						onClick={() => openFeedback()}
					>
						{FEEDBACK_COPY.invite.primary}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-auto rounded-full px-4 text-xs text-muted-foreground"
						onClick={() => snoozeFeedbackInvite()}
					>
						{FEEDBACK_COPY.invite.notNow}
					</Button>
				</div>
			</div>
		</FloatingPromptShell>
	);
}
