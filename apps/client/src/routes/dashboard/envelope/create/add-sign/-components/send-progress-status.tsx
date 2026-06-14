"use client";

import { DialogTitle } from "@/src/lib/components/ui/dialog";
import { ShimmerText } from "@/src/lib/components/ui/shimmer-text";
import { cn } from "@/src/lib/utils/index";
import { SendProgressIcon } from "@/src/routes/dashboard/envelope/create/add-sign/-components/send-progress-icon";
import { SendProgressStageFlip } from "@/src/routes/dashboard/envelope/create/add-sign/-components/send-progress-stage-flip";
import { useSendProgressTip } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-send-progress-tip";
import {
	getActiveSendProgressDisplay,
	type SendProgressState,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/progress";

const DETAIL_PLACEHOLDER = " ";

export function SendProgressStatus(props: {
	state: SendProgressState;
	titleId: string;
}) {
	const display = getActiveSendProgressDisplay(props.state);
	const shimmerActive = !display.isError;
	const tipActive = !display.isError && props.state.status === "running";
	const tip = useSendProgressTip(tipActive);
	const detailKey = display.detail ?? "";

	return (
		<div className="flex w-full flex-col items-center gap-4 text-center">
			<SendProgressIcon variant={display.isError ? "error" : "loading"} />

			<div className="flex w-full flex-col items-center px-2">
				<div className="relative h-8 w-full max-w-sm shrink-0">
					<SendProgressStageFlip stageKey={display.label}>
						<DialogTitle
							id={props.titleId}
							className={cn(
								"font-manrope text-xl tracking-tight sm:text-2xl",
								display.isError && "text-destructive",
							)}
						>
							<ShimmerText active={shimmerActive} className="block">
								{display.label}
							</ShimmerText>
						</DialogTitle>
					</SendProgressStageFlip>
				</div>

				<div
					className={cn(
						"relative w-full max-w-xs shrink-0 overflow-hidden",
						display.detail ? "mt-1 h-5" : "h-0",
					)}
					aria-live="polite"
				>
					<SendProgressStageFlip stageKey={detailKey || "empty"}>
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
					</SendProgressStageFlip>
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
							<SendProgressStageFlip stageKey={tip}>
								<p className="text-pretty text-sm leading-snug text-muted-foreground/90">
									{tip}
								</p>
							</SendProgressStageFlip>
						</div>
					</section>
				) : null}
			</div>
		</div>
	);
}
