import type { IsoCountryCode } from "@filosign/shared";
import type { FormEvent } from "react";
import { useId } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogClose,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import { PayoutAccessRequestFields } from "./fields";

const DIALOG_BADGE = "Payout access";

export function PayoutAccessRequestDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationLegalName: string;
	onOrganizationLegalNameChange: (v: string) => void;
	organizationCountry: IsoCountryCode | "";
	onOrganizationCountryChange: (v: IsoCountryCode) => void;
	requesterName: string;
	onRequesterNameChange: (v: string) => void;
	requesterRole: string;
	onRequesterRoleChange: (v: string) => void;
	useCase: string;
	onUseCaseChange: (v: string) => void;
	externalWalletAccessRequested: boolean;
	onExternalWalletAccessRequestedChange: (v: boolean) => void;
	externalWalletUseCase: string;
	onExternalWalletUseCaseChange: (v: string) => void;
	externalWalletComplianceCert: boolean;
	onExternalWalletComplianceCertChange: (v: boolean) => void;
	acceptTerms: boolean;
	onAcceptTermsChange: (v: boolean) => void;
	sanctionsSelfCert: boolean;
	onSanctionsSelfCertChange: (v: boolean) => void;
	canSubmit: boolean;
	pending: boolean;
	onSubmit: () => void;
}) {
	const titleId = useId();

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!props.canSubmit || props.pending) return;
		props.onSubmit();
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.payoutAccessRequestDialog}
					badge={DIALOG_BADGE}
				/>

				<FeatureDialogPanel>
					<FeatureDialogClose disabled={props.pending} />

					<FeatureDialogHeader
						title="Request payout attachment access"
						titleId={titleId}
						description="Tell us how your workspace will use USDC payout instructions. Filosign reviews each request before you can attach payouts to envelopes."
					/>

					<FeatureDialogBody>
						<form onSubmit={handleSubmit} className="space-y-4">
							<PayoutAccessRequestFields
								organizationLegalName={props.organizationLegalName}
								onOrganizationLegalNameChange={
									props.onOrganizationLegalNameChange
								}
								organizationCountry={props.organizationCountry}
								onOrganizationCountryChange={props.onOrganizationCountryChange}
								requesterName={props.requesterName}
								onRequesterNameChange={props.onRequesterNameChange}
								requesterRole={props.requesterRole}
								onRequesterRoleChange={props.onRequesterRoleChange}
								useCase={props.useCase}
								onUseCaseChange={props.onUseCaseChange}
								externalWalletAccessRequested={
									props.externalWalletAccessRequested
								}
								onExternalWalletAccessRequestedChange={
									props.onExternalWalletAccessRequestedChange
								}
								externalWalletUseCase={props.externalWalletUseCase}
								onExternalWalletUseCaseChange={
									props.onExternalWalletUseCaseChange
								}
								externalWalletComplianceCert={
									props.externalWalletComplianceCert
								}
								onExternalWalletComplianceCertChange={
									props.onExternalWalletComplianceCertChange
								}
								acceptTerms={props.acceptTerms}
								onAcceptTermsChange={props.onAcceptTermsChange}
								sanctionsSelfCert={props.sanctionsSelfCert}
								onSanctionsSelfCertChange={props.onSanctionsSelfCertChange}
								disabled={props.pending}
							/>

							<FeatureDialogActions>
								<Button
									type="submit"
									variant="primary"
									size="lg"
									className="w-full"
									disabled={!props.canSubmit || props.pending}
									isLoading={props.pending}
								>
									{props.pending ? "Submitting…" : "Request access"}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full"
									onClick={() => props.onOpenChange(false)}
									disabled={props.pending}
								>
									Cancel
								</Button>
							</FeatureDialogActions>
						</form>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
