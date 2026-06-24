"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	WorkflowDialogActions,
	WorkflowDialogBody,
	WorkflowDialogContent,
} from "@/src/lib/components/ui/workflow-dialog";
import { WorkflowProgressStatus } from "@/src/lib/domains/workflow-progress/components/status";
import type { WorkflowProgressState } from "@/src/lib/domains/workflow-progress/types";

export function WorkflowProgressDialog(props: {
	open: boolean;
	state: WorkflowProgressState | null;
	fallbackLabel: string;
	errorFallbackLabel?: string;
	retryLabel?: string;
	dismissLabel?: string;
	footerText?: string;
	icon: ReactNode;
	tips: readonly string[];
	onRetry?: () => void;
	onDismiss?: () => void;
}) {
	const titleId = useId();
	const isError = props.state?.status === "error";

	return (
		<Dialog open={props.open}>
			<WorkflowDialogContent
				aria-labelledby={titleId}
				className="flex w-[min(100%-2rem,28rem)] flex-col sm:max-w-md"
			>
				<WorkflowDialogBody className="flex flex-col items-center px-6 pt-6 pb-2">
					{props.state ? (
						<WorkflowProgressStatus
							state={props.state}
							titleId={titleId}
							fallbackLabel={props.fallbackLabel}
							errorFallbackLabel={props.errorFallbackLabel}
							icon={props.icon}
							tips={props.tips}
						/>
					) : null}
				</WorkflowDialogBody>

				{!isError && props.footerText ? (
					<p className="shrink-0 px-6 pb-4 pt-4 text-center text-[11px] leading-snug text-muted-foreground/75">
						{props.footerText}
					</p>
				) : null}

				{isError ? (
					<WorkflowDialogActions>
						<Button
							type="button"
							variant="primary"
							size="lg"
							className="w-full"
							onClick={props.onRetry}
						>
							{props.retryLabel ?? "Try again"}
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="lg"
							className="w-full"
							onClick={props.onDismiss}
						>
							{props.dismissLabel ?? "Dismiss"}
						</Button>
					</WorkflowDialogActions>
				) : null}
			</WorkflowDialogContent>
		</Dialog>
	);
}
