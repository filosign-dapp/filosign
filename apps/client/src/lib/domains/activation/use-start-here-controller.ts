import {
	useActivationProgress,
	useMarkActivationMilestone,
	useProvisionPracticeEnvelope,
	useUnmarkActivationMilestone,
} from "@filosign/react/users";
import type { ActivationStepId, BillingPlanId } from "@filosign/shared";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { resolveActivationStepHref } from "@/src/lib/domains/activation/resolve-step-href";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { safeAsync } from "@/src/lib/utils/safe";
import {
	useActivationChecklistActions,
	useActivationChecklistAnalytics,
	useActivationNextStepsAnalytics,
} from "./use-analytics";

export function useStartHereController() {
	const navigate = useNavigate();
	const { evaluated, isLoading, activationQuery, entitlementsQuery } =
		useActivationProgress();
	const markMilestone = useMarkActivationMilestone();
	const unmarkMilestone = useUnmarkActivationMilestone();
	const {
		provision,
		ensureAcknowledged,
		isPending: isProvisioning,
	} = useProvisionPracticeEnvelope();
	const {
		trackStepClick,
		trackDismiss,
		trackRestore,
		trackMilestoneMarked,
		trackNextStepsDismiss,
	} = useActivationChecklistActions();

	const checklistDismissed = useStorePersist(
		(state) => state.activationUi.checklistDismissed,
	);
	const checklistCollapsed = useStorePersist(
		(state) => state.activationUi.checklistCollapsed,
	);
	const nextStepsDismissed = useStorePersist(
		(state) => state.activationUi.nextStepsDismissed,
	);
	const seenAdvancedStepIds = useStorePersist(
		(state) => state.activationUi.seenAdvancedStepIds,
	);
	const lastSeenBillingPlanId = useStorePersist(
		(state) => state.activationUi.lastSeenBillingPlanId,
	);
	const setActivationUi = useStorePersist((state) => state.setActivationUi);
	const [newlyUnlockedStepIds, setNewlyUnlockedStepIds] = useState<
		ActivationStepId[]
	>([]);
	const seededAdvancedStepsRef = useRef(false);

	const billingPlanId = (entitlementsQuery.data?.planId ??
		"free") as BillingPlanId;
	const advancedStepIds = useMemo(
		() =>
			evaluated?.steps
				.filter((step) => step.section === "advanced")
				.map((step) => step.id) ?? [],
		[evaluated?.steps],
	);

	useEffect(() => {
		if (isLoading || !evaluated) return;

		if (!seededAdvancedStepsRef.current && lastSeenBillingPlanId == null) {
			seededAdvancedStepsRef.current = true;
			setActivationUi({
				lastSeenBillingPlanId: billingPlanId,
				seenAdvancedStepIds: advancedStepIds,
			});
			return;
		}

		const newSteps = advancedStepIds.filter(
			(id) => !seenAdvancedStepIds.includes(id),
		);

		if (billingPlanId !== lastSeenBillingPlanId && newSteps.length > 0) {
			setNewlyUnlockedStepIds(newSteps);
			setActivationUi({
				lastSeenBillingPlanId: billingPlanId,
				seenAdvancedStepIds: advancedStepIds,
			});
			toast.success("New tutorials are available for your plan.", {
				action: {
					label: "View",
					onClick: () => navigate({ to: "/dashboard/support/tutorials" }),
				},
			});
			return;
		}

		if (billingPlanId !== lastSeenBillingPlanId) {
			setActivationUi({
				lastSeenBillingPlanId: billingPlanId,
				seenAdvancedStepIds: advancedStepIds,
			});
		}
	}, [
		advancedStepIds,
		billingPlanId,
		evaluated,
		isLoading,
		lastSeenBillingPlanId,
		navigate,
		seenAdvancedStepIds,
		setActivationUi,
	]);

	const showChecklist =
		!isLoading &&
		evaluated != null &&
		!evaluated.basicOnboardingComplete &&
		!checklistDismissed;

	const showNextSteps =
		!isLoading &&
		evaluated != null &&
		evaluated.basicOnboardingComplete &&
		!nextStepsDismissed;

	const showFloatingCard = showChecklist || showNextSteps;

	useActivationChecklistAnalytics(showChecklist);
	useActivationNextStepsAnalytics(showNextSteps);

	const nextStepActions = useMemo(() => {
		if (!evaluated) return null;

		const advancedSteps = evaluated.steps.filter(
			(step) => step.section === "advanced",
		);
		const sandboxStep = evaluated.steps.find(
			(step) => step.id === "try_sandbox_workflow",
		);
		const sandboxHref = sandboxStep
			? resolveActivationStepHref(sandboxStep)
			: null;
		const isSandboxDeployment = activationQuery.data?.deployment === "sandbox";
		const sandboxNote = evaluated.steps.find(
			(step) => step.id === "sandbox_testnet_limits",
		)?.description;

		return {
			advancedStepTeasers: advancedSteps.slice(0, 3),
			advancedStepCount: advancedSteps.length,
			sandboxHref: sandboxHref && !isSandboxDeployment ? sandboxHref : null,
			isSandboxDeployment,
			sandboxNote,
			tutorialsHref: "/dashboard/support/tutorials" as const,
		};
	}, [activationQuery.data?.deployment, evaluated]);

	const dismissChecklist = useCallback(() => {
		trackDismiss();
		setActivationUi({
			checklistDismissed: true,
			lastSeenCatalogVersion: evaluated?.catalogVersion ?? 1,
		});
	}, [evaluated?.catalogVersion, setActivationUi, trackDismiss]);

	const dismissNextSteps = useCallback(() => {
		trackNextStepsDismiss();
		setActivationUi({ nextStepsDismissed: true });
	}, [setActivationUi, trackNextStepsDismiss]);

	const toggleCollapsed = useCallback(() => {
		setActivationUi({ checklistCollapsed: !checklistCollapsed });
	}, [checklistCollapsed, setActivationUi]);

	const restoreChecklist = useCallback(() => {
		trackRestore();
		setActivationUi({ checklistDismissed: false });
	}, [setActivationUi, trackRestore]);

	const markProofLearned = useCallback(async () => {
		await markMilestone.mutateAsync("proof_packet_learned");
		trackMilestoneMarked("proof_packet_learned");
	}, [markMilestone, trackMilestoneMarked]);

	const unmarkProofLearned = useCallback(async () => {
		await unmarkMilestone.mutateAsync("proof_packet_learned");
	}, [unmarkMilestone]);

	const trackStepNavigation = useCallback(
		(stepId: ActivationStepId) => {
			trackStepClick(stepId);
		},
		[trackStepClick],
	);

	const openSignPractice = useCallback(async () => {
		trackStepNavigation("sign_practice_agreement");
		const existingPracticePieceCid =
			activationQuery.data?.practicePieceCid ?? null;
		let pieceCid: string;

		if (existingPracticePieceCid) {
			const [, ackError] = await safeAsync(() =>
				ensureAcknowledged(existingPracticePieceCid),
			);
			if (ackError) {
				toast.error("Could not accept your practice document. Try again.");
				return;
			}
			pieceCid = existingPracticePieceCid;
		} else {
			const [provisioned, error] = await safeAsync(provision());
			if (error || !provisioned) {
				toast.error("Could not prepare your practice document. Try again.");
				return;
			}
			pieceCid = provisioned;
		}

		void navigate({
			to: "/dashboard/document/sign",
			search: { pieceCid },
		});
	}, [
		activationQuery.data?.practicePieceCid,
		ensureAcknowledged,
		navigate,
		provision,
		trackStepNavigation,
	]);

	return {
		evaluated,
		isLoading,
		showChecklist,
		showNextSteps,
		showFloatingCard,
		checklistCollapsed,
		checklistDismissed,
		nextStepsDismissed,
		isProvisioning,
		isMarking: markMilestone.isPending || unmarkMilestone.isPending,
		newlyUnlockedStepIds,
		nextStepActions,
		dismissChecklist,
		dismissNextSteps,
		toggleCollapsed,
		restoreChecklist,
		markProofLearned,
		unmarkProofLearned,
		openSignPractice,
		trackStepNavigation,
	};
}
