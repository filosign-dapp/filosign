import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-queries";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useActiveOrgId } from "../orgs/useOrganizations";

export function useOrgBillingSummary() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();

	return useQuery({
		...rpcQuery.billing.getOrgSummary.queryOptions(),
		enabled: isAuthed && Boolean(activeOrgId),
	});
}

export type CreateOrgCheckoutSessionInput = {
	planId: "teams" | "teams_pro";
	interval?: "monthly" | "yearly";
	seatCount: number;
	returnUrl: string;
};

export function useCreateOrgCheckoutSession() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (input: CreateOrgCheckoutSessionInput) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.createOrgCheckoutSession.call({
				planId: input.planId,
				interval: input.interval ?? "monthly",
				seatCount: input.seatCount,
				returnUrl: input.returnUrl,
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.billing.getOrgSummary.key(),
			});
			await invalidateEntitlements(queryClient, rpcQuery);
		},
	});
}

export function usePreviewOrgSeatChange() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (seatCount: number) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.previewOrgSeatChange.call({ seatCount });
		},
	});
}

export function useUpdateOrgSeats() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (seatCount: number) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.updateOrgSeats.call({ seatCount });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.billing.getOrgSummary.key(),
			});
			await invalidateEntitlements(queryClient, rpcQuery);
		},
	});
}

export function useCreateOrgPortalSession() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async () => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.createOrgPortalSession.call();
		},
	});
}

export function usePreviewOrgPlanChange() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (planId: "teams" | "teams_pro") => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.previewOrgPlanChange.call({ planId });
		},
	});
}

export function useChangeOrgPlan() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (planId: "teams" | "teams_pro") => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.changeOrgPlan.call({ planId });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.billing.getOrgSummary.key(),
			});
			await invalidateEntitlements(queryClient, rpcQuery);
		},
	});
}
