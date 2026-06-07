import { Button } from "@/src/lib/components/ui/button";
import { SignPageEnvelopeCommentsBlock } from "@/src/lib/domains/files/envelope-comments-block";
import { ConditionalAttachmentsPanel } from "@/src/routes/dashboard/document/sign/-components/conditional-attachments-panel";
import { SettlementStatusPanel } from "@/src/routes/dashboard/document/sign/-components/settlement-status-panel";
import { SignSidebar } from "@/src/routes/dashboard/document/sign/-components/sidebar";
import { SupplementaryPacketsSignPanel } from "@/src/routes/dashboard/document/sign/-components/supplementary-packets-sign-panel";
import {
	useSignFile,
	useSignIdentity,
	useSignMeta,
	useSignPlacement,
	useSignSettlements,
	useSignSigning,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignDocumentSidebar() {
	const { file } = useSignFile();
	const { signerAddress } = useSignIdentity();
	const {
		myPlacementFields,
		fieldCompletions,
		completedFieldIds,
		togglePlacementField,
		clearPlacementField,
		isFieldComplete,
		canSubmitPlacementSign,
	} = useSignPlacement();
	const { canSign, alreadySigned } = useSignSigning();
	const { formatAddress, isSender } = useSignMeta();
	const settlements = useSignSettlements();

	const signers = file?.signers ?? [];
	const envelopeProgress = file?.envelopeProgress;
	const canSignByRouting = file?.participantAccess?.canSignByRouting;
	const isRevoked = Boolean(envelopeProgress?.revokedBeforeCompletedAt);
	const isComplete = Boolean(envelopeProgress?.completedAt);
	const signingStarted = (envelopeProgress?.requiredSignaturesCount ?? 0) > 0;
	const canRecall = isSender && !isRevoked && !isComplete;
	const canClearSignatures =
		isSender && !isRevoked && !isComplete && signingStarted;

	const fieldsChecklistProps = {
		fields: myPlacementFields,
		fieldCompletions,
		completedFieldIds,
		alreadySigned,
		canSign,
		canSubmitPlacementSign,
		isFieldComplete,
		onToggleField: (field: Parameters<typeof togglePlacementField>[0]) =>
			void togglePlacementField(field),
		onClearField: clearPlacementField,
	};

	return (
		<SignSidebar.Root>
			<SignSidebar.Section
				title="Your fields"
				description={
					alreadySigned
						? "Your signature is recorded. Field markers show where you signed."
						: "Complete each assigned field on the document before signing."
				}
				sticky={canSign && !alreadySigned}
			>
				<SignSidebar.FieldsChecklist {...fieldsChecklistProps} />
			</SignSidebar.Section>

			<SignSidebar.Section title="Signers">
				<SignSidebar.SignersList
					signers={signers}
					signatures={file?.signatures}
					viewers={undefined}
					signerAddress={signerAddress}
					formatAddress={formatAddress}
					loading={!file}
					envelopeProgress={envelopeProgress}
					canSignByRouting={canSignByRouting}
				/>
			</SignSidebar.Section>

			{isRevoked ? (
				<p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
					This envelope was voided on-chain and can no longer be signed.
				</p>
			) : null}

			{settlements.rules.length > 0 ? (
				<SignSidebar.Section title="Attached payouts">
					<SettlementStatusPanel
						rules={settlements.rules}
						formatAddress={formatAddress}
						isSender={isSender}
						walletAddress={settlements.walletAddress}
						canSettleByRuleId={settlements.canSettleByRuleId}
						trySettlePending={settlements.trySettlePending}
						manualSettlePending={settlements.manualSettlePending}
						settlingRuleId={settlements.settlingRuleId}
						onTrySettleRule={settlements.onTrySettleRule}
						onManualSettleRule={settlements.onManualSettleRule}
						revokePending={settlements.revokePending}
						onRevokeAllowance={settlements.onRevokeAllowance}
						canManageSettlements={settlements.canManageSettlements}
						onCancelRule={settlements.onCancelRule}
						onUpdateRule={settlements.onUpdateRule}
						cancelPending={settlements.cancelPending}
						updatePending={settlements.updatePending}
						signingStarted={signingStarted}
						hideSectionHeader
					/>
				</SignSidebar.Section>
			) : null}

			<SupplementaryPacketsSignPanel />

			<SignSidebar.CollapsibleSection
				title="More details"
				defaultOpen={isSender}
			>
				<SignPageEnvelopeCommentsBlock file={file} />

				{isSender ? (
					<div className="flex flex-wrap gap-2">
						{canRecall ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs text-destructive hover:text-destructive"
								onClick={() => settlements.setRecallDialogOpen(true)}
							>
								Void envelope
							</Button>
						) : null}
						{canClearSignatures ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs text-destructive hover:text-destructive"
								onClick={() => settlements.setClearSignaturesDialogOpen(true)}
							>
								Clear signatures
							</Button>
						) : null}
						{settlements.canAttachSettlement ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => settlements.setAttachDialogOpen(true)}
							>
								Add payout
							</Button>
						) : null}
						{settlements.canManageSettlements ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => settlements.setAmendDialogOpen(true)}
							>
								Change signer
							</Button>
						) : null}
					</div>
				) : null}

				{isSender ? (
					<ConditionalAttachmentsPanel
						packets={file?.conditionalAttachmentPackets}
						signingStarted={signingStarted}
					/>
				) : null}

				{file?.viewers && file.viewers.length > 0 ? (
					<SignSidebar.SignersList
						signers={[]}
						signatures={undefined}
						viewers={file.viewers}
						signerAddress={signerAddress}
						formatAddress={formatAddress}
					/>
				) : null}
			</SignSidebar.CollapsibleSection>
		</SignSidebar.Root>
	);
}
