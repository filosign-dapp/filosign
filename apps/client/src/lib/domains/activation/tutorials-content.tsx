import {
	BASIC_ONBOARDING_STEP_IDS,
	type EvaluatedActivationStep,
} from "@filosign/shared";
import { ActivationRouteHints } from "@/src/lib/domains/activation/route-hints";
import { ActivationTutorialSteps } from "@/src/lib/domains/activation/tutorial-steps";
import { useStartHereController } from "@/src/lib/domains/activation/use-start-here-controller";

function filterExtendedSteps(steps: EvaluatedActivationStep[]) {
	return steps.filter(
		(step) =>
			!(BASIC_ONBOARDING_STEP_IDS as readonly string[]).includes(step.id),
	);
}

export function ActivationTutorialsContent() {
	const {
		evaluated,
		isLoading,
		isMarking,
		newlyUnlockedStepIds,
		markProofLearned,
		trackStepNavigation,
	} = useStartHereController();

	if (isLoading || !evaluated) return null;

	const extendedSteps = filterExtendedSteps(evaluated.steps);
	const learnSteps = extendedSteps.filter((step) => step.section === "core");
	const advancedSteps = extendedSteps.filter(
		(step) => step.section === "advanced",
	);
	const disclosureSteps = extendedSteps.filter(
		(step) => step.section === "disclosure",
	);

	return (
		<div className="space-y-8">
			<ActivationRouteHints className="mb-2" />

			{learnSteps.length > 0 ? (
				<section className="space-y-3">
					<div>
						<h2 className="text-sm font-medium text-foreground">Learn more</h2>
						<p className="text-sm text-muted-foreground">
							Go deeper once you have sent your first envelope.
						</p>
					</div>
					<ActivationTutorialSteps
						steps={learnSteps}
						isMarking={isMarking}
						onMarkProofLearned={() => void markProofLearned()}
						onTrackStep={trackStepNavigation}
					/>
				</section>
			) : null}

			{advancedSteps.length > 0 ? (
				<section className="space-y-3">
					<div>
						<h2 className="text-sm font-medium text-foreground">
							Explore for your plan
						</h2>
						<p className="text-sm text-muted-foreground">
							Optional workflows unlocked by your subscription.
						</p>
					</div>
					<ActivationTutorialSteps
						steps={advancedSteps}
						newlyUnlockedStepIds={newlyUnlockedStepIds}
						onTrackStep={trackStepNavigation}
					/>
				</section>
			) : null}

			{disclosureSteps.length > 0 ? (
				<section className="space-y-3">
					<h2 className="text-sm font-medium text-foreground">Notes</h2>
					<div className="space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
						{disclosureSteps.map((step) => (
							<p key={step.id}>
								<span className="font-medium text-foreground">
									{step.title}:{" "}
								</span>
								{step.description}
							</p>
						))}
					</div>
				</section>
			) : null}

			{learnSteps.length === 0 &&
			advancedSteps.length === 0 &&
			disclosureSteps.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					You are all set for now. Check back when your plan unlocks more
					features.
				</p>
			) : null}
		</div>
	);
}
