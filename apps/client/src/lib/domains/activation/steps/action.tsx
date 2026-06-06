import type { EvaluatedActivationStep } from "@filosign/shared";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { resolveActivationStepHref } from "@/src/lib/domains/activation/resolve-step-href";

type ActivationStepActionProps = {
	step: EvaluatedActivationStep;
	size: "sm" | "xs";
	variant: "secondary" | "ghost";
	compact: boolean;
	isProvisioning: boolean;
	isMarking: boolean;
	onMarkProofLearned?: () => void;
	onOpenSignPractice?: () => void;
	onTrackStep?: (stepId: EvaluatedActivationStep["id"]) => void;
	startNewEnvelope: () => void;
};

function stepLinkLabel(
	step: EvaluatedActivationStep,
	compact: boolean,
): string {
	if (step.linkKey === "pricing") return "View plans";
	if (step.linkKey === "sandbox") return "Open sandbox";
	return compact ? "Go" : "Open";
}

function LearnProofStepAction({
	step,
	isMarking,
	onMarkProofLearned,
	onTrackStep,
}: Pick<
	ActivationStepActionProps,
	"step" | "isMarking" | "onMarkProofLearned" | "onTrackStep"
>) {
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

function SignPracticeStepAction({
	size,
	variant,
	compact,
	isProvisioning,
	onOpenSignPractice,
}: Pick<
	ActivationStepActionProps,
	"size" | "variant" | "compact" | "isProvisioning" | "onOpenSignPractice"
>) {
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

function SendEnvelopeStepAction({
	step,
	size,
	variant,
	compact,
	onTrackStep,
	startNewEnvelope,
}: Pick<
	ActivationStepActionProps,
	"step" | "size" | "variant" | "compact" | "onTrackStep" | "startNewEnvelope"
>) {
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

function DefaultStepLinkAction({
	step,
	size,
	variant,
	compact,
	onTrackStep,
}: Pick<
	ActivationStepActionProps,
	"step" | "size" | "variant" | "compact" | "onTrackStep"
>) {
	const resolvedHref = resolveActivationStepHref(step);
	if (!resolvedHref) return null;

	const label = stepLinkLabel(step, compact);

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
}

export function ActivationStepAction(props: ActivationStepActionProps) {
	const { step, compact } = props;
	if (step.completed) return null;

	if (step.id === "learn_proof_packets") {
		if (compact) return null;
		return <LearnProofStepAction {...props} />;
	}

	if (step.id === "sign_practice_agreement") {
		return <SignPracticeStepAction {...props} />;
	}

	if (step.id === "send_first_envelope") {
		return <SendEnvelopeStepAction {...props} />;
	}

	return <DefaultStepLinkAction {...props} />;
}
