import {
	BASIC_ONBOARDING_STEP_IDS,
	type EvaluatedActivationStep,
} from "@filosign/shared";
import { useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/src/lib/components/ui/accordion";
import {
	activationSectionLeadClassName,
	activationSectionTitleClassName,
} from "@/src/lib/domains/activation/copy";
import { ProofPacketTutorialSection } from "@/src/lib/domains/activation/proof-packet-tutorial-section";
import {
	ActivationTutorialCard,
	ActivationTutorialCardCompleted,
} from "@/src/lib/domains/activation/tutorial-card";
import { useStartHereController } from "@/src/lib/domains/activation/use-start-here-controller";

function filterExtendedSteps(steps: EvaluatedActivationStep[]) {
	return steps.filter(
		(step) =>
			!(BASIC_ONBOARDING_STEP_IDS as readonly string[]).includes(step.id) &&
			step.section !== "disclosure",
	);
}

export function ActivationTutorialsContent() {
	const {
		evaluated,
		isLoading,
		isMarking,
		newlyUnlockedStepIds,
		markProofLearned,
		unmarkProofLearned,
		trackStepNavigation,
	} = useStartHereController();

	if (isLoading || !evaluated) return null;

	const extendedSteps = filterExtendedSteps(evaluated.steps);
	const proofStep = extendedSteps.find(
		(step) => step.id === "learn_proof_packets",
	);
	const advancedSteps = extendedSteps.filter(
		(step) => step.section === "advanced",
	);

	const activeProofStep = proofStep && !proofStep.completed ? proofStep : null;
	const activeAdvancedSteps = advancedSteps.filter((step) => !step.completed);
	const completedSteps = [
		...(proofStep?.completed ? [proofStep] : []),
		...advancedSteps.filter((step) => step.completed),
	];

	const hasActiveContent =
		activeProofStep != null || activeAdvancedSteps.length > 0;

	const [completedOpen, setCompletedOpen] = useState<string[]>([]);

	return (
		<div className="space-y-10">
			{activeProofStep ? (
				<section className="space-y-4">
					<div className="space-y-1">
						<h2 className={activationSectionTitleClassName}>Learn more</h2>
						<p className={activationSectionLeadClassName}>
							Go deeper once you have sent your first envelope.
						</p>
					</div>
					<ProofPacketTutorialSection
						step={activeProofStep}
						isMarking={isMarking}
						onMarkProofLearned={() => void markProofLearned()}
						onTrackStep={trackStepNavigation}
					/>
				</section>
			) : null}

			{activeAdvancedSteps.length > 0 ? (
				<section className="space-y-4">
					<div className="space-y-1">
						<h2 className={activationSectionTitleClassName}>
							Explore for your plan
						</h2>
						<p className={activationSectionLeadClassName}>
							Optional workflows unlocked by your subscription.
						</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						{activeAdvancedSteps.map((step) => (
							<ActivationTutorialCard
								key={step.id}
								step={step}
								isNew={newlyUnlockedStepIds.includes(step.id)}
								onTrackStep={trackStepNavigation}
							/>
						))}
					</div>
				</section>
			) : null}

			{completedSteps.length > 0 ? (
				<section className="space-y-3">
					<Accordion value={completedOpen} onValueChange={setCompletedOpen}>
						<AccordionItem value="completed" className="border-border/60">
							<AccordionTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground">
								Completed ({completedSteps.length})
							</AccordionTrigger>
							<AccordionContent>
								<div className="space-y-1 pt-1">
									{completedSteps.map((step) => (
										<ActivationTutorialCardCompleted
											key={step.id}
											step={step}
											isUndoing={isMarking}
											onUndo={(completedStep) => {
												if (completedStep.id === "learn_proof_packets") {
													void unmarkProofLearned();
												}
											}}
										/>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</section>
			) : null}

			{!hasActiveContent && completedSteps.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					You are all set for now. Check back when your plan unlocks more
					features.
				</p>
			) : null}

			{!hasActiveContent && completedSteps.length > 0 ? (
				<p className="text-sm text-muted-foreground">
					You have finished every tutorial available for your plan.
				</p>
			) : null}
		</div>
	);
}
