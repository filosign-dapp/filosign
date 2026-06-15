"use client";

import type { ReactNode } from "react";
import { DialogTitle } from "@/src/lib/components/ui/dialog";
import { ShimmerText } from "@/src/lib/components/ui/shimmer-text";
import { WorkflowProgressIconShell } from "@/src/lib/domains/workflow-progress/components/icon-shell";
import { WorkflowProgressStageFlip } from "@/src/lib/domains/workflow-progress/components/stage-flip";
import { useWorkflowProgressTip } from "@/src/lib/domains/workflow-progress/hooks/use-workflow-progress-tip";
import type { WorkflowProgressState } from "@/src/lib/domains/workflow-progress/types";
import { getActiveWorkflowProgressDisplay } from "@/src/lib/domains/workflow-progress/utils/state";
import { cn } from "@/src/lib/utils/index";

const DETAIL_PLACEHOLDER = " ";

export function WorkflowProgressStatus(props: {
	state: WorkflowProgressState;
	titleId: string;
	fallbackLabel: string;
	errorFallbackLabel?: string;
	icon: ReactNode;
	tips: readonly string[];
}) {
	const display = getActiveWorkflowProgressDisplay(props.state, {
		fallbackLabel: props.fallbackLabel,
		errorFallbackLabel: props.errorFallbackLabel,
	});
	const shimmerActive = !display.isError;
	const tipActive = !display.isError && props.state.status === "running";
	const tip = useWorkflowProgressTip(tipActive, props.tips);
	const detailKey = display.detail ?? "";

	return (
		<div className="flex w-full flex-col items-center gap-4 text-center">
			<WorkflowProgressIconShell
				variant={display.isError ? "error" : "loading"}
			>
				{props.icon}
			</WorkflowProgressIconShell>

			<div className="flex w-full flex-col items-center px-2">
				<div className="relative h-7 w-full shrink-0">
					<WorkflowProgressStageFlip stageKey={display.label}>
						<DialogTitle
							id={props.titleId}
							className={cn(
								"whitespace-nowrap font-manrope text-base tracking-tight sm:text-lg",
								display.isError && "text-destructive",
							)}
						>
							<ShimmerText active={shimmerActive} className="inline-block">
								{display.label}
							</ShimmerText>
						</DialogTitle>
					</WorkflowProgressStageFlip>
				</div>

				<div
					className={cn(
						"relative w-full max-w-xs shrink-0 overflow-hidden",
						display.detail ? "mt-1 h-5" : "h-0",
					)}
					aria-live="polite"
				>
					<WorkflowProgressStageFlip stageKey={detailKey || "empty"}>
						{display.detail ? (
							<p
								className={cn(
									"text-xs leading-relaxed",
									display.isError
										? "text-destructive/90"
										: "text-muted-foreground/80",
								)}
							>
								{display.detail}
							</p>
						) : (
							<span className="invisible text-xs leading-relaxed" aria-hidden>
								{DETAIL_PLACEHOLDER}
							</span>
						)}
					</WorkflowProgressStageFlip>
				</div>

				{!display.isError ? (
					<section
						className="mt-3 w-full max-w-xs shrink-0 border-t border-border/50 pt-4"
						aria-label="While you wait"
					>
						<p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
							While you wait
						</p>
						<div className="relative h-11 w-full">
							<WorkflowProgressStageFlip stageKey={tip}>
								<p className="text-pretty text-sm leading-snug text-muted-foreground/90">
									{tip}
								</p>
							</WorkflowProgressStageFlip>
						</div>
					</section>
				) : null}
			</div>
		</div>
	);
}
