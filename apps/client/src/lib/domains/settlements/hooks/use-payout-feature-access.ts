import {
	useSettlementFeatureAccessGet,
	useSubmitSettlementFeatureAccessRequest,
} from "@filosign/react/orgs";
import {
	type IsoCountryCode,
	SETTLEMENT_FEATURE_TERMS_VERSION,
} from "@filosign/shared";
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

function resetPayoutAccessForm(setters: {
	setOrganizationLegalName: (v: string) => void;
	setOrganizationCountry: (v: IsoCountryCode | "") => void;
	setRequesterName: (v: string) => void;
	setRequesterRole: (v: string) => void;
	setUseCase: (v: string) => void;
	setAcceptTerms: (v: boolean) => void;
	setSanctionsSelfCert: (v: boolean) => void;
	setExternalWalletAccessRequested: (v: boolean) => void;
	setExternalWalletUseCase: (v: string) => void;
	setExternalWalletComplianceCert: (v: boolean) => void;
}) {
	setters.setOrganizationLegalName("");
	setters.setOrganizationCountry("");
	setters.setRequesterName("");
	setters.setRequesterRole("");
	setters.setUseCase("");
	setters.setAcceptTerms(false);
	setters.setSanctionsSelfCert(false);
	setters.setExternalWalletAccessRequested(false);
	setters.setExternalWalletUseCase("");
	setters.setExternalWalletComplianceCert(false);
}

export function usePayoutFeatureAccess(args: {
	activeOrgId: string | undefined;
	canManage: boolean;
	onSubmitted?: () => void;
}) {
	const accessQuery = useSettlementFeatureAccessGet(args.activeOrgId);
	const submitRequest = useSubmitSettlementFeatureAccessRequest();

	const [organizationLegalName, setOrganizationLegalName] = useState("");
	const [organizationCountry, setOrganizationCountry] = useState<
		IsoCountryCode | ""
	>("");
	const [requesterName, setRequesterName] = useState("");
	const [requesterRole, setRequesterRole] = useState("");
	const [useCase, setUseCase] = useState("");
	const [externalWalletAccessRequested, setExternalWalletAccessRequested] =
		useState(false);
	const [externalWalletUseCase, setExternalWalletUseCase] = useState("");
	const [externalWalletComplianceCert, setExternalWalletComplianceCert] =
		useState(false);
	const [acceptTerms, setAcceptTerms] = useState(false);
	const [sanctionsSelfCert, setSanctionsSelfCert] = useState(false);

	const status = (accessQuery.data?.status ??
		"none") as PayoutFeatureAccessStatus;
	const termsCurrent = accessQuery.data?.termsCurrent !== false;
	const reviewNote =
		typeof accessQuery.data?.reviewNote === "string"
			? accessQuery.data.reviewNote
			: null;

	const externalFieldsValid =
		!externalWalletAccessRequested ||
		(externalWalletUseCase.trim().length >= 30 && externalWalletComplianceCert);

	const canSubmitRequest =
		Boolean(args.activeOrgId) &&
		args.canManage &&
		organizationLegalName.trim().length > 0 &&
		organizationCountry.length > 0 &&
		requesterName.trim().length > 0 &&
		requesterRole.trim().length > 0 &&
		useCase.trim().length >= 10 &&
		acceptTerms &&
		sanctionsSelfCert &&
		externalFieldsValid;

	const submitAccessRequest = () => {
		if (!args.activeOrgId || !organizationCountry) return;
		submitRequest.mutate(
			{
				organizationId: args.activeOrgId,
				acceptTerms: true,
				sanctionsSelfCert: true,
				useCase: useCase.trim(),
				termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
				organizationLegalName: organizationLegalName.trim(),
				organizationCountry,
				requesterName: requesterName.trim(),
				requesterRole: requesterRole.trim(),
				externalWalletAccessRequested,
				...(externalWalletAccessRequested
					? {
							externalWalletUseCase: externalWalletUseCase.trim(),
							externalWalletComplianceCert: true,
						}
					: {}),
			},
			localMutationErrorOptions({
				onSuccess: () => {
					toastUser.success(TOASTS.workspace.payoutAccessRequested);
					resetPayoutAccessForm({
						setOrganizationLegalName,
						setOrganizationCountry,
						setRequesterName,
						setRequesterRole,
						setUseCase,
						setAcceptTerms,
						setSanctionsSelfCert,
						setExternalWalletAccessRequested,
						setExternalWalletUseCase,
						setExternalWalletComplianceCert,
					});
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
		organizationLegalName,
		setOrganizationLegalName,
		organizationCountry,
		setOrganizationCountry,
		requesterName,
		setRequesterName,
		requesterRole,
		setRequesterRole,
		useCase,
		setUseCase,
		externalWalletAccessRequested,
		setExternalWalletAccessRequested,
		externalWalletUseCase,
		setExternalWalletUseCase,
		externalWalletComplianceCert,
		setExternalWalletComplianceCert,
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
