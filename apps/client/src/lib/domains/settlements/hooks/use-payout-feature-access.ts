import {
	useSettlementFeatureAccessGet,
	useSubmitSettlementFeatureAccessRequest,
} from "@filosign/react/orgs";
import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";
import { useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { localMutationErrorOptions } from "@/src/lib/errors";
import type { PayoutFeatureAccessControls } from "../payout-access/controls";

export type PayoutFeatureAccessStatus =
	| "none"
	| "pending"
	| "approved"
	| "rejected"
	| "suspended";

export function usePayoutFeatureAccess(args: {
	activeOrgId: string | undefined;
	canManage: boolean;
	onSubmitted?: () => void;
}) {
	const accessQuery = useSettlementFeatureAccessGet(args.activeOrgId);
	const submitRequest = useSubmitSettlementFeatureAccessRequest();

	const [useCase, setUseCase] = useState("");
	const [acceptTerms, setAcceptTerms] = useState(false);
	const [sanctionsSelfCert, setSanctionsSelfCert] = useState(false);

	const status = (accessQuery.data?.status ??
		"none") as PayoutFeatureAccessStatus;
	const termsCurrent = accessQuery.data?.termsCurrent !== false;
	const reviewNote =
		typeof accessQuery.data?.reviewNote === "string"
			? accessQuery.data.reviewNote
			: null;

	const canSubmitRequest =
		Boolean(args.activeOrgId) &&
		args.canManage &&
		useCase.trim().length >= 10 &&
		acceptTerms &&
		sanctionsSelfCert;

	const submitAccessRequest = () => {
		if (!args.activeOrgId) return;
		submitRequest.mutate(
			{
				organizationId: args.activeOrgId,
				acceptTerms: true,
				sanctionsSelfCert: true,
				useCase: useCase.trim(),
				termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
			},
			localMutationErrorOptions({
				onSuccess: () => {
					toastUser.success(TOASTS.workspace.payoutAccessRequested);
					setUseCase("");
					setAcceptTerms(false);
					setSanctionsSelfCert(false);
					args.onSubmitted?.();
				},
			}),
		);
	};

	return {
		accessQuery,
		status,
		termsCurrent,
		reviewNote,
		useCase,
		setUseCase,
		acceptTerms,
		setAcceptTerms,
		sanctionsSelfCert,
		setSanctionsSelfCert,
		canSubmitRequest,
		submitAccessRequest,
		submitPending: submitRequest.isPending,
	} satisfies PayoutFeatureAccessControls & {
		accessQuery: typeof accessQuery;
		status: PayoutFeatureAccessStatus;
		termsCurrent: boolean;
		reviewNote: string | null;
	};
}
