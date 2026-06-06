import type { EvaluatedActivationStep } from "@filosign/shared";
import { ActivationStepRow } from "@/src/lib/domains/activation/steps/row";
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

	return (
		<ul className={cn(compact ? "space-y-2" : "space-y-3")}>
			{steps.map((step) => (
				<ActivationStepRow
					key={step.id}
					step={step}
					compact={compact}
					isNew={newlyUnlockedStepIds.includes(step.id)}
					isProvisioning={isProvisioning}
					isMarking={isMarking}
					onMarkProofLearned={onMarkProofLearned}
					onOpenSignPractice={onOpenSignPractice}
					onTrackStep={onTrackStep}
					startNewEnvelope={startNewEnvelope}
				/>
			))}
		</ul>
	);
}
