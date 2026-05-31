import {
	useSettlementFeatureAccessGet,
	useSubmitSettlementFeatureAccessRequest,
} from "@filosign/react/orgs";
import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";
import { useState } from "react";
import { toast } from "sonner";

export type PayoutFeatureAccessStatus =
	| "none"
	| "pending"
	| "approved"
	| "rejected"
	| "suspended";

export function usePayoutFeatureAccess(args: {
	activeOrgId: string | undefined;
	canManage: boolean;
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
			{
				onSuccess: () => {
					toast.success("Payout attachment access requested");
					setUseCase("");
					setAcceptTerms(false);
					setSanctionsSelfCert(false);
				},
				onError: (err) => {
					toast.error(
						err instanceof Error ? err.message : "Could not submit request",
					);
				},
			},
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
	};
}
