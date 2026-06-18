import type { IsoCountryCode } from "@filosign/shared";

export type PayoutFeatureAccessControls = {
	organizationLegalName: string;
	setOrganizationLegalName: (value: string) => void;
	organizationCountry: IsoCountryCode | "";
	setOrganizationCountry: (value: IsoCountryCode | "") => void;
	requesterName: string;
	setRequesterName: (value: string) => void;
	requesterRole: string;
	setRequesterRole: (value: string) => void;
	useCase: string;
	setUseCase: (value: string) => void;
	acceptTerms: boolean;
	setAcceptTerms: (value: boolean) => void;
	sanctionsSelfCert: boolean;
	setSanctionsSelfCert: (value: boolean) => void;
	canSubmitRequest: boolean;
	submitPending: boolean;
	submitAccessRequest: () => void;
};

export function payoutAccessRequestDialogProps(
	dialog: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	},
	access: PayoutFeatureAccessControls,
) {
	return {
		open: dialog.open,
		onOpenChange: dialog.onOpenChange,
		organizationLegalName: access.organizationLegalName,
		onOrganizationLegalNameChange: access.setOrganizationLegalName,
		organizationCountry: access.organizationCountry,
		onOrganizationCountryChange: access.setOrganizationCountry,
		requesterName: access.requesterName,
		onRequesterNameChange: access.setRequesterName,
		requesterRole: access.requesterRole,
		onRequesterRoleChange: access.setRequesterRole,
		useCase: access.useCase,
		onUseCaseChange: access.setUseCase,
		acceptTerms: access.acceptTerms,
		onAcceptTermsChange: access.setAcceptTerms,
		sanctionsSelfCert: access.sanctionsSelfCert,
		onSanctionsSelfCertChange: access.setSanctionsSelfCert,
		canSubmit: access.canSubmitRequest,
		pending: access.submitPending,
		onSubmit: access.submitAccessRequest,
	};
}
