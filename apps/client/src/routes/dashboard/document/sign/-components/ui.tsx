import type { ReactNode } from "react";
import { ColdShareDialog } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import {
	AttachmentPacketDialog,
	PayoutRuleDialog,
} from "@/src/lib/domains/satellites";
import {
	PayoutAccessRequestDialog,
	payoutAccessRequestDialogProps,
} from "@/src/lib/domains/settlements";
import { AmendSignerDialog } from "@/src/routes/dashboard/document/sign/-components/amend-signer-dialog";
import { SignShellLayout } from "@/src/routes/dashboard/document/sign/-components/body";
import { ClearEnvelopeSignaturesDialog } from "@/src/routes/dashboard/document/sign/-components/clear-envelope-signatures-dialog";
import { RecallEnvelopeDialog } from "@/src/routes/dashboard/document/sign/-components/recall-envelope-dialog";
import { SettlementChangeProgressDialog } from "@/src/routes/dashboard/document/sign/-components/settlement-change-progress-dialog";
import { SettlementUpdateDialog } from "@/src/routes/dashboard/document/sign/-components/settlement-update-dialog";
import { SignProgressDialog } from "@/src/routes/dashboard/document/sign/-components/sign-progress-dialog";
import { SignSuccessDialog } from "@/src/routes/dashboard/document/sign/-components/success-dialog";
import {
	type SignDocumentContextValue,
	SignDocumentProvider,
	useSignAttachments,
	useSignColdShare,
	useSignDocumentContext,
	useSignFile,
	useSignSettlements,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { hasSpecificSignerPayout } from "@/src/routes/dashboard/document/sign/-lib/utils/governance";

function SignRoot({
	value,
	children,
}: {
	value: SignDocumentContextValue;
	children: ReactNode;
}) {
	return <SignDocumentProvider value={value}>{children}</SignDocumentProvider>;
}

function SignShell({ children }: { children?: ReactNode }) {
	return <SignShellLayout>{children}</SignShellLayout>;
}

function SignColdShareDialog() {
	const coldShare = useSignColdShare();
	return (
		<ColdShareDialog
			open={coldShare.coldShareDialogOpen}
			share={coldShare.coldShare}
			onDone={() => {
				coldShare.setColdShareDialogOpen(false);
				coldShare.setColdShare(null);
			}}
		/>
	);
}

function SignSuccessDialogSlot() {
	const { sign } = useSignDocumentContext();
	return (
		<SignSuccessDialog
			open={sign.signSuccess.signSuccessDialogOpen}
			onOpenChange={sign.signSuccess.setSignSuccessDialogOpen}
		/>
	);
}

function SignProgressDialogSlot() {
	const { sign } = useSignDocumentContext();
	return (
		<SignProgressDialog
			open={sign.signing.signProgressOpen}
			state={sign.signing.signProgressState}
			onRetry={sign.signing.retrySign}
			onDismiss={sign.signing.dismissSignProgress}
		/>
	);
}

function SignSettlementDialogs() {
	const { file } = useSignFile();
	const settlements = useSignSettlements();
	const attachments = useSignAttachments();
	const signingStarted =
		(file?.envelopeProgress?.requiredSignaturesCount ?? 0) > 0;

	return (
		<>
			<SettlementUpdateDialog
				open={settlements.updateDialogOpen}
				onOpenChange={settlements.setUpdateDialogOpen}
				allRules={settlements.allRules}
				rule={settlements.updateRuleTarget}
				onConfirm={settlements.onConfirmUpdateRule}
				pending={settlements.updatePending}
			/>

			<SettlementChangeProgressDialog
				open={settlements.changeProgressOpen}
				state={settlements.changeProgressState}
				mode={settlements.changeProgressMode}
				onRetry={settlements.retryChangeProgress}
				onDismiss={settlements.dismissChangeProgress}
			/>

			<AmendSignerDialog
				open={settlements.amendDialogOpen}
				onOpenChange={settlements.setAmendDialogOpen}
				signers={settlements.unsignedAmendOptions}
				signingStarted={signingStarted}
				hasSpecificSignerPayout={hasSpecificSignerPayout(settlements.allRules)}
				onConfirm={settlements.onConfirmAmendSigner}
				pending={settlements.amendPending}
			/>
			<RecallEnvelopeDialog
				open={settlements.recallDialogOpen}
				onOpenChange={settlements.setRecallDialogOpen}
				onConfirm={() =>
					settlements.onConfirmRecallEnvelope(file?.organizationId)
				}
				pending={settlements.recallPending}
			/>
			<ClearEnvelopeSignaturesDialog
				open={settlements.clearSignaturesDialogOpen}
				onOpenChange={settlements.setClearSignaturesDialogOpen}
				onConfirm={() =>
					settlements.onConfirmClearEnvelopeSignatures(
						file?.registryAddress as `0x${string}` | undefined,
					)
				}
				pending={settlements.clearSignaturesPending}
			/>
			<PayoutRuleDialog
				open={settlements.attachDialogOpen}
				onOpenChange={settlements.setAttachDialogOpen}
				recipients={settlements.attachRecipients}
				routingContext={settlements.routingContext}
				payerWalletAddress={settlements.attachPayerWalletAddress}
				payerLabel={settlements.attachPayerLabel}
				walletBalance={settlements.attachWalletBalance}
				walletBalanceFormatted={settlements.attachWalletBalanceFormatted}
				balancePending={settlements.attachBalancePending}
				balanceError={settlements.attachBalanceError}
				onAttachLegs={settlements.onConfirmAttachSettlement}
				attachPending={settlements.attachPending}
			/>
			<AttachmentPacketDialog
				open={attachments.attachDialogOpen}
				onOpenChange={attachments.setAttachDialogOpen}
				recipients={attachments.attachRecipients}
				routingContext={attachments.routingContext}
				onSave={attachments.onSaveAttachment}
				savePending={attachments.attachPending}
			/>
			<PayoutAccessRequestDialog
				{...payoutAccessRequestDialogProps(
					{
						open: settlements.requestDialogOpen,
						onOpenChange: settlements.setRequestDialogOpen,
					},
					settlements.payoutAccess,
				)}
			/>
		</>
	);
}

export const Sign = {
	Root: SignRoot,
	Shell: SignShell,
	Dialogs: function SignDialogs() {
		return (
			<>
				<SignColdShareDialog />
				<SignProgressDialogSlot />
				<SignSuccessDialogSlot />
				<SignSettlementDialogs />
			</>
		);
	},
};
