import type { EvaluatedActivationStep } from "@filosign/shared";
import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { Badge } from "@/src/lib/components/ui/badge";
import { ActivationStepAction } from "@/src/lib/domains/activation/steps/action";
import { cn } from "@/src/lib/utils";

type ActivationStepRowProps = {
	step: EvaluatedActivationStep;
	compact: boolean;
	isNew: boolean;
	isProvisioning: boolean;
	isMarking: boolean;
	onMarkProofLearned?: () => void;
	onOpenSignPractice?: () => void;
	onTrackStep?: (stepId: EvaluatedActivationStep["id"]) => void;
	startNewEnvelope: () => void;
};

export function ActivationStepRow({
	step,
	compact,
	isNew,
	isProvisioning,
	isMarking,
	onMarkProofLearned,
	onOpenSignPractice,
	onTrackStep,
	startNewEnvelope,
}: ActivationStepRowProps) {
	const actionProps = {
		step,
		compact,
		isProvisioning,
		isMarking,
		onMarkProofLearned,
		onOpenSignPractice,
		onTrackStep,
		startNewEnvelope,
	};

	return (
		<li
			className={cn(
				compact
					? "flex items-center gap-2 rounded-md px-1 py-1"
					: "flex items-start gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-3",
				!compact && isNew && "border-primary/40 bg-primary/5",
			)}
		>
			{step.completed ? (
				<CheckCircleIcon
					className={cn(
						"shrink-0 text-primary",
						compact ? "size-4" : "mt-0.5 size-5",
					)}
					weight="fill"
				/>
			) : (
				<CircleIcon
					className={cn(
						"shrink-0 text-muted-foreground",
						compact ? "size-4" : "mt-0.5 size-5",
					)}
				/>
			)}
			<div className="min-w-0 flex-1">
				<div
					className={cn(
						"flex items-center gap-2",
						compact ? "min-w-0" : "flex-wrap",
					)}
				>
					<p
						className={cn(
							"font-medium",
							compact ? "truncate text-xs" : "text-sm",
							step.completed && "text-muted-foreground line-through",
						)}
					>
						{step.title}
					</p>
					{isNew ? (
						<Badge variant="secondary" className="text-[10px]">
							New
						</Badge>
					) : null}
				</div>
				{!compact ? (
					<p className="text-sm text-muted-foreground">{step.description}</p>
				) : null}
				{!step.completed && !compact ? (
					<div className="flex flex-wrap gap-2 pt-1">
						<ActivationStepAction
							{...actionProps}
							size="sm"
							variant="secondary"
						/>
					</div>
				) : null}
			</div>
			{!step.completed && compact ? (
				<div className="shrink-0">
					<ActivationStepAction {...actionProps} size="xs" variant="ghost" />
				</div>
			) : null}
		</li>
	);
}
