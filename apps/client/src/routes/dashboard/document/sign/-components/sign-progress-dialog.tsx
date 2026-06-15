import { PenNibIcon } from "@phosphor-icons/react";
import { WorkflowProgressDialog } from "@/src/lib/domains/workflow-progress";
import { SIGN_PROGRESS_TIPS } from "@/src/routes/dashboard/document/sign/-lib/sign-progress-tips";
import type { SignProgressState } from "@/src/routes/dashboard/document/sign/-lib/utils/sign/progress";

export function SignProgressDialog(props: {
	open: boolean;
	state: SignProgressState | null;
	onRetry?: () => void;
	onDismiss?: () => void;
}) {
	return (
		<WorkflowProgressDialog
			open={props.open}
			state={props.state}
			fallbackLabel="Signing envelope"
			errorFallbackLabel="Could not sign envelope"
			footerText="Stay on this tab until signing finishes."
			icon={<PenNibIcon className="size-8" weight="fill" />}
			tips={SIGN_PROGRESS_TIPS}
			onRetry={props.onRetry}
			onDismiss={props.onDismiss}
		/>
	);
}
