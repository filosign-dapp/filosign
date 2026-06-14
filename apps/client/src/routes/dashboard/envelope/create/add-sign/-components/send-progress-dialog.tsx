import { useId } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	WorkflowDialogActions,
	WorkflowDialogBody,
	WorkflowDialogContent,
} from "@/src/lib/components/ui/workflow-dialog";
import { SendProgressStatus } from "@/src/routes/dashboard/envelope/create/add-sign/-components/send-progress-status";
import type { SendProgressState } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/progress";

export function SendProgressDialog(props: {
	open: boolean;
	state: SendProgressState | null;
	onRetry?: () => void;
	onDismiss?: () => void;
}) {
	const titleId = useId();
	const { open, state, onRetry, onDismiss } = props;
	const isError = state?.status === "error";

	return (
		<Dialog open={open}>
			<WorkflowDialogContent
				aria-labelledby={titleId}
				className="flex w-[min(100%-2rem,24rem)] flex-col sm:max-w-sm"
			>
				<WorkflowDialogBody className="flex flex-col items-center px-6 pt-6 pb-2">
					{state ? (
						<SendProgressStatus state={state} titleId={titleId} />
					) : null}
				</WorkflowDialogBody>

				{!isError ? (
					<p className="shrink-0 px-6 pb-4 pt-4 text-center text-[11px] leading-snug text-muted-foreground/75">
						Stay on this tab until sending finishes.
					</p>
				) : null}

				{isError ? (
					<WorkflowDialogActions>
						<Button
							type="button"
							variant="primary"
							size="lg"
							className="w-full"
							onClick={onRetry}
						>
							Try again
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="lg"
							className="w-full"
							onClick={onDismiss}
						>
							Dismiss
						</Button>
					</WorkflowDialogActions>
				) : null}
			</WorkflowDialogContent>
		</Dialog>
	);
}
