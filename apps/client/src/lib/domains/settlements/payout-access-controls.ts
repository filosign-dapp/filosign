export type PayoutFeatureAccessControls = {
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
