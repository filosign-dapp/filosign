import {
	type ActivationMilestoneId,
	type BillingPlanId,
	evaluateActivationChecklist,
} from "@filosign/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useEntitlements } from "../billing/useEntitlements";

export function useActivationProgress() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const entitlementsQuery = useEntitlements();

	const activationQuery = useQuery({
		...rpcQuery.users.activation.get.queryOptions(),
		enabled: isAuthed,
		staleTime: 60_000,
	});

	const evaluated = useMemo(() => {
		const activation = activationQuery.data;
		const entitlements = entitlementsQuery.data;
		if (!activation) return null;

		const milestones = new Set<ActivationMilestoneId>(activation.milestones);
		const billingPlanId = (entitlements?.planId ?? "free") as BillingPlanId;

		return evaluateActivationChecklist({
			deployment: activation.deployment,
			billingPlanId,
			milestones,
			features: entitlements?.features ?? {},
			practicePieceCid: activation.practicePieceCid,
		});
	}, [activationQuery.data, entitlementsQuery.data]);

	return {
		activationQuery,
		entitlementsQuery,
		evaluated,
		isLoading: activationQuery.isLoading || entitlementsQuery.isLoading,
	};
}
