import { CoinsIcon } from "@phosphor-icons/react";
import type {
	SettlementChangeMode,
	SettlementChangeProgressState,
} from "@/src/lib/domains/settlements/change-progress";
import { SETTLEMENT_CHANGE_PROGRESS_TIPS } from "@/src/lib/domains/settlements/change-progress-tips";
import { WorkflowProgressDialog } from "@/src/lib/domains/workflow-progress";

const PROGRESS_COPY: Record<
	SettlementChangeMode,
	{ fallbackLabel: string; errorFallbackLabel: string }
> = {
	update: {
		fallbackLabel: "Updating payout",
		errorFallbackLabel: "Could not update payout",
	},
	cancel: {
		fallbackLabel: "Removing payout",
		errorFallbackLabel: "Could not remove payout",
	},
};

export function SettlementChangeProgressDialog(props: {
	open: boolean;
	state: SettlementChangeProgressState | null;
	mode: SettlementChangeMode;
	onRetry?: () => void;
	onDismiss?: () => void;
}) {
	const copy = PROGRESS_COPY[props.mode];

	return (
		<WorkflowProgressDialog
			open={props.open}
			state={props.state}
			fallbackLabel={copy.fallbackLabel}
			errorFallbackLabel={copy.errorFallbackLabel}
			footerText="Stay on this tab until this finishes."
			icon={<CoinsIcon className="size-8" weight="fill" />}
			tips={SETTLEMENT_CHANGE_PROGRESS_TIPS}
			onRetry={props.onRetry}
			onDismiss={props.onDismiss}
		/>
	);
}
