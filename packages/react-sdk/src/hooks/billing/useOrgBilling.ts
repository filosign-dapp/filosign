import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-queries";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useActiveOrgId } from "../orgs/useOrganizations";
import type { UpgradePlanLimitReason } from "./upgrade-plan-limit-reason";

export function useOrgBillingSummary() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();

	return useQuery({
		...rpcQuery.billing.getOrgSummary.queryOptions(),
		enabled: isAuthed && Boolean(activeOrgId),
	});
}

export type OrgCheckoutPlanId = "individual" | "teams" | "teams_pro";

export type CreateOrgCheckoutSessionInput = {
	planId: OrgCheckoutPlanId;
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

export type CreateNewWorkspaceCheckoutInput = {
	planId: OrgCheckoutPlanId;
	interval?: "monthly" | "yearly";
	seatCount: number;
	returnUrl: string;
};

export function useCreateNewWorkspaceCheckoutSession() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (input: CreateNewWorkspaceCheckoutInput) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.createNewWorkspaceCheckout.call({
				planId: input.planId,
				interval: input.interval ?? "monthly",
				seatCount: input.seatCount,
				returnUrl: input.returnUrl,
			});
		},
	});
}

const NEW_WORKSPACE_PENDING_POLL_MS = 2_000;
const NEW_WORKSPACE_PENDING_TIMEOUT_MS = 45_000;

export function useNewWorkspacePendingStatus(
	pendingBillingId: string | null,
	enabled: boolean,
) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const pollStartedAt = useRef<number | null>(null);

	useEffect(() => {
		if (enabled && pendingBillingId) {
			pollStartedAt.current = Date.now();
		} else {
			pollStartedAt.current = null;
		}
	}, [enabled, pendingBillingId]);

	return useQuery({
		...rpcQuery.billing.getNewWorkspacePendingStatus.queryOptions({
			input: { pendingBillingId: pendingBillingId ?? "" },
		}),
		enabled: isAuthed && enabled && Boolean(pendingBillingId),
		refetchInterval: (query) => {
			if (!pollStartedAt.current || query.state.data?.ready) return false;
			if (
				Date.now() - pollStartedAt.current >
				NEW_WORKSPACE_PENDING_TIMEOUT_MS
			) {
				return false;
			}
			return NEW_WORKSPACE_PENDING_POLL_MS;
		},
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
