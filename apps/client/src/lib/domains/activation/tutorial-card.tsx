import type { EvaluatedActivationStep } from "@filosign/shared";
import { USER_REVOCABLE_ACTIVATION_MILESTONES } from "@filosign/shared";
import {
	ArrowSquareOutIcon,
	ArrowsSplitIcon,
	CreditCardIcon,
	FlaskIcon,
	type Icon,
	PaperclipIcon,
	UsersIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button, buttonVariants } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { resolveActivationStepHref } from "@/src/lib/domains/activation/resolve-step-href";
import { cn } from "@/src/lib/utils";

type StepIcon = Icon;

const STEP_ICONS: Partial<Record<EvaluatedActivationStep["id"], StepIcon>> = {
	gated_file_release: PaperclipIcon,
	payout_packet_access: WalletIcon,
	invite_teammates: UsersIcon,
	advanced_settlements: ArrowsSplitIcon,
	try_sandbox_workflow: FlaskIcon,
	upgrade_premium_plan: CreditCardIcon,
};

function stepActionLabel(step: EvaluatedActivationStep): string {
	if (step.actionLabel) return step.actionLabel;
	if (step.linkKey === "pricing") return "View plans";
	if (step.linkKey === "sandbox") return "Open sandbox";
	return "Open";
}

type ActivationTutorialCardProps = {
	step: EvaluatedActivationStep;
	isNew?: boolean;
	onTrackStep?: (stepId: EvaluatedActivationStep["id"]) => void;
	className?: string;
};

export function ActivationTutorialCard({
	step,
	isNew = false,
	onTrackStep,
	className,
}: ActivationTutorialCardProps) {
	const resolvedHref = resolveActivationStepHref(step);
	const Icon = STEP_ICONS[step.id] ?? PaperclipIcon;
	const label = stepActionLabel(step);

	return (
		<article
			className={cn(
				"flex flex-col gap-4 rounded-large border border-border/60 bg-card/80 p-5 shadow-sm ring-1 ring-foreground/5",
				isNew && "border-primary/40 bg-primary/5",
				className,
			)}
		>
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
					<Icon className="size-5" aria-hidden />
				</div>
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="text-base font-medium text-foreground">
							{step.title}
						</h3>
						{isNew ? (
							<Badge variant="secondary" className="text-[10px]">
								New
							</Badge>
						) : null}
					</div>
					<p className="text-sm leading-relaxed text-muted-foreground">
						{step.description}
					</p>
				</div>
			</div>

			{resolvedHref ? (
				<div className="flex justify-start pt-1">
					{resolvedHref.external ? (
						<a
							href={resolvedHref.href}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonVariants({
								variant: "primary",
								size: "sm",
								className: "min-w-36 rounded-full gap-1.5",
							})}
							onClick={() => onTrackStep?.(step.id)}
						>
							{label}
							<ArrowSquareOutIcon className="size-3.5" aria-hidden />
						</a>
					) : (
						<Link
							to={resolvedHref.href}
							className={buttonVariants({
								variant: "primary",
								size: "sm",
								className: "min-w-36 rounded-full",
							})}
							onClick={() => onTrackStep?.(step.id)}
						>
							{label}
						</Link>
					)}
				</div>
			) : null}
		</article>
	);
}

type ActivationTutorialCardCompletedProps = {
	step: EvaluatedActivationStep;
	isUndoing?: boolean;
	onUndo?: (step: EvaluatedActivationStep) => void;
};

function canUndoTutorialStep(step: EvaluatedActivationStep): boolean {
	return (
		step.milestoneId != null &&
		(USER_REVOCABLE_ACTIVATION_MILESTONES as readonly string[]).includes(
			step.milestoneId,
		)
	);
}

export function ActivationTutorialCardCompleted({
	step,
	isUndoing = false,
	onUndo,
}: ActivationTutorialCardCompletedProps) {
	const showUndo = canUndoTutorialStep(step) && onUndo != null;

	return (
		<div className="flex items-center justify-between gap-3 py-1 text-sm">
			<span className="font-medium text-muted-foreground line-through">
				{step.title}
			</span>
			{showUndo ? (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					className="shrink-0 rounded-full text-muted-foreground"
					disabled={isUndoing}
					onClick={() => onUndo(step)}
				>
					{isUndoing ? (
						<span className="inline-flex items-center gap-1.5">
							<InlineLoader size="sm" />
							Undoing
						</span>
					) : (
						"Mark incomplete"
					)}
				</Button>
			) : null}
		</div>
	);
}
