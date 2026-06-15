import { SendPlaneIcon } from "@/src/lib/components/app/send-plane-icon";
import type { SendProgressState } from "@/src/lib/domains/placement/types";
import { WorkflowProgressDialog } from "@/src/lib/domains/workflow-progress";
import { SEND_PROGRESS_TIPS } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/send-progress-tips";

export function SendProgressDialog(props: {
	open: boolean;
	state: SendProgressState | null;
	onRetry?: () => void;
	onDismiss?: () => void;
}) {
	return (
		<WorkflowProgressDialog
			open={props.open}
			state={props.state}
			fallbackLabel="Sending envelope"
			errorFallbackLabel="Could not send envelope"
			footerText="Stay on this tab until sending finishes."
			icon={<SendPlaneIcon className="size-8" weight="fill" />}
			tips={SEND_PROGRESS_TIPS}
			onRetry={props.onRetry}
			onDismiss={props.onDismiss}
		/>
	);
}
