import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-queries";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useActiveOrgId } from "../orgs/useOrganizations";
import type { UpgradePlanLimitReason } from "./upgrade-plan-limit-reason";

export function useUserBillingSummary() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.billing.getUserSummary.queryOptions(),
		enabled: isAuthed,
	});
}

export function useWorkspaceBillingContext() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();

	return useQuery({
		...rpcQuery.billing.getWorkspaceBillingContext.queryOptions(),
		enabled: isAuthed && Boolean(activeOrgId),
	});
}

export function useUpgradeOfferings(reason: UpgradePlanLimitReason | null) {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.billing.getUpgradeOfferings.queryOptions({
			input: { reason: reason ?? "documents.sent.monthly" },
		}),
		enabled: isAuthed && reason !== null,
	});
}

export function useCreateUserCheckoutSession() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (input: {
			planId: "individual";
			interval?: "monthly" | "yearly";
			returnUrl: string;
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.createCheckoutSession.call({
				planId: input.planId,
				interval: input.interval ?? "monthly",
				returnUrl: input.returnUrl,
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.billing.getUserSummary.key(),
			});
		},
	});
}

export function useCreateUserPortalSession() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async () => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.createPortalSession.call();
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.billing.getUserSummary.key(),
			});
			await invalidateEntitlements(queryClient, rpcQuery);
		},
	});
}
