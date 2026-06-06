import type { EvaluatedActivationStep } from "@filosign/shared";
import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button, buttonVariants } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { resolveActivationStepHref } from "@/src/lib/domains/activation/resolve-step-href";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import { cn } from "@/src/lib/utils";

type ActivationTutorialStepsProps = {
	steps: EvaluatedActivationStep[];
	compact?: boolean;
	isProvisioning?: boolean;
	isMarking?: boolean;
	newlyUnlockedStepIds?: string[];
	onMarkProofLearned?: () => void;
	onOpenSignPractice?: () => void;
	onTrackStep?: (stepId: EvaluatedActivationStep["id"]) => void;
};

export function ActivationTutorialSteps({
	steps,
	compact = false,
	isProvisioning = false,
	isMarking = false,
	newlyUnlockedStepIds = [],
	onMarkProofLearned,
	onOpenSignPractice,
	onTrackStep,
}: ActivationTutorialStepsProps) {
	if (steps.length === 0) return null;
	const startNewEnvelope = useStartNewEnvelope();

	const renderStepAction = (
		step: EvaluatedActivationStep,
		size: "sm" | "xs",
		variant: "secondary" | "ghost",
	) => {
		if (step.completed) return null;

		if (step.id === "learn_proof_packets") {
			if (compact) return null;
			return (
				<>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						disabled={isMarking}
						onClick={() => onMarkProofLearned?.()}
					>
						{isMarking ? (
							<span className="inline-flex items-center gap-2">
								<InlineLoader size="sm" />
								Saving
							</span>
						) : (
							"Mark as learned"
						)}
					</Button>
					<Link
						to="/dashboard/support/tutorials"
						className={buttonVariants({ variant: "ghost", size: "sm" })}
						onClick={() => onTrackStep?.(step.id)}
					>
						Read more
					</Link>
				</>
			);
		}

		if (step.id === "sign_practice_agreement") {
			return (
				<Button
					type="button"
					size={size}
					variant={variant}
					disabled={isProvisioning}
					onClick={() => onOpenSignPractice?.()}
				>
					{isProvisioning ? (
						size === "xs" ? (
							<InlineLoader size="sm" />
						) : (
							<span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
								<InlineLoader size="sm" />
								Preparing
							</span>
						)
					) : compact ? (
						"Sign"
					) : (
						"Open practice document"
					)}
				</Button>
			);
		}

		if (step.id === "send_first_envelope") {
			return (
				<Button
					type="button"
					size={size}
					variant={variant}
					onClick={() => {
						onTrackStep?.(step.id);
						startNewEnvelope();
					}}
				>
					{compact ? "Send" : "Start envelope"}
				</Button>
			);
		}

		const resolvedHref = resolveActivationStepHref(step);
		if (!resolvedHref) return null;

		const label =
			step.linkKey === "pricing"
				? "View plans"
				: step.linkKey === "sandbox"
					? "Open sandbox"
					: compact
						? "Go"
						: "Open";

		if (resolvedHref.external) {
			return (
				<a
					href={resolvedHref.href}
					target="_blank"
					rel="noreferrer"
					className={buttonVariants({ variant, size })}
					onClick={() => onTrackStep?.(step.id)}
				>
					{label}
				</a>
			);
		}

		return (
			<Link
				to={resolvedHref.href}
				className={buttonVariants({ variant, size })}
				onClick={() => onTrackStep?.(step.id)}
			>
				{label}
			</Link>
		);
	};

	return (
		<ul className={cn(compact ? "space-y-2" : "space-y-3")}>
			{steps.map((step) => {
				const isNew = newlyUnlockedStepIds.includes(step.id);

				return (
					<li
						key={step.id}
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
								<p className="text-sm text-muted-foreground">
									{step.description}
								</p>
							) : null}
							{!step.completed && !compact ? (
								<div className="flex flex-wrap gap-2 pt-1">
									{renderStepAction(step, "sm", "secondary")}
								</div>
							) : null}
						</div>
						{!step.completed && compact ? (
							<div className="shrink-0">
								{renderStepAction(step, "xs", "ghost")}
							</div>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}
