import { useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { ConditionalAttachmentsPanel } from "@/src/routes/dashboard/document/sign/-components/conditional-attachments-panel";
import { SettlementStatusPanel } from "@/src/routes/dashboard/document/sign/-components/settlement-status-panel";
import { SignSidebar } from "@/src/routes/dashboard/document/sign/-components/sidebar";
import {
	useSignFile,
	useSignIdentity,
	useSignMeta,
	useSignSettlements,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { isEnvelopeVoided } from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";
import { senderToolsClosedCopy } from "@/src/routes/dashboard/document/sign/-lib/utils/governance";

export function SignContextRail() {
	const { file } = useSignFile();
	const { signerAddress } = useSignIdentity();
	const { formatAddress, isSender } = useSignMeta();
	const settlements = useSignSettlements();
	const [executeReplacementOpen, setExecuteReplacementOpen] = useState(false);

	const signers = file?.signers ?? [];
	const envelopeProgress = file?.envelopeProgress;
	const canSignByRouting = file?.participantAccess?.canSignByRouting;
	const isRevoked = isEnvelopeVoided(envelopeProgress);
	const isComplete = Boolean(envelopeProgress?.completedAt);
	const signingStarted = (envelopeProgress?.requiredSignaturesCount ?? 0) > 0;
	const canRecall = isSender && !isRevoked && !isComplete;
	const canClearSignatures =
		isSender &&
		!isRevoked &&
		!isComplete &&
		signingStarted &&
		!settlements.paidSettlementLegs;
	const governanceClosedCopy = senderToolsClosedCopy({
		envelopeProgress,
		pendingSignerReplacement: Boolean(settlements.pendingSignerReplacement),
	});
	const pendingReplacement = settlements.pendingSignerReplacement;
	const oldSignerEmail = pendingReplacement?.oldEmail ?? null;
	const newSignerEmail = pendingReplacement?.newEmail ?? null;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
			{pendingReplacement ? (
				<div className="rounded-large border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-amber-100">
					<p className="font-semibold text-amber-800 dark:text-amber-200">
						Roster change pending
					</p>
					<p className="mt-1 leading-relaxed text-muted-foreground">
						{isSender
							? oldSignerEmail && newSignerEmail
								? `Replace ${oldSignerEmail} with ${newSignerEmail}. Signing is frozen until you execute or cancel.`
								: "Signing is frozen until you execute or cancel this change."
							: oldSignerEmail && newSignerEmail
								? `Signer change from ${oldSignerEmail} to ${newSignerEmail} is pending. Signing is frozen until the sender finishes it.`
								: "Signing is frozen until the sender executes or cancels this change."}
					</p>
					{isSender ? (
						<div className="mt-3 flex flex-wrap gap-2">
							<Button
								type="button"
								size="sm"
								variant="primary"
								className="h-7 text-[11px]"
								disabled={settlements.executeSignerReplacementPending}
								onClick={() => setExecuteReplacementOpen(true)}
							>
								{settlements.executeSignerReplacementPending
									? "Executing…"
									: "Execute change"}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="h-7 text-[11px]"
								disabled={settlements.cancelSignerReplacementPending}
								onClick={() =>
									void settlements
										.onCancelSignerReplacement()
										.catch(console.error)
								}
							>
								{settlements.cancelSignerReplacementPending
									? "Cancelling…"
									: "Cancel"}
							</Button>
						</div>
					) : null}
					<ConfirmAlertDialog
						open={executeReplacementOpen}
						onOpenChange={setExecuteReplacementOpen}
						title="Execute signer change?"
						description="This clears every signature on the envelope. All signers must sign again before the envelope can complete."
						confirmLabel="Execute change"
						destructive
						pending={settlements.executeSignerReplacementPending}
						onConfirm={() => settlements.onExecuteSignerReplacement()}
					/>
				</div>
			) : null}

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
					pendingSignerReplacement={pendingReplacement}
				/>
			</SignSidebar.Section>

			{isRevoked ? (
				<p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
					This envelope was voided and can no longer be signed.
				</p>
			) : null}

			{settlements.rules.length > 0 ? (
				<SignSidebar.Section
					title={
						<span className="inline-flex items-center gap-2">
							Attached payouts
							<ProFeatureMark size="xs" />
						</span>
					}
				>
					<SettlementStatusPanel
						rules={settlements.rules}
						formatAddress={formatAddress}
						isSender={isSender}
						walletAddress={settlements.walletAddress}
						canSettleByRuleId={settlements.canSettleByRuleId}
						firstCanExecuteAtByRuleId={settlements.firstCanExecuteAtByRuleId}
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

			{isSender ? (
				<SignSidebar.Section title="Sender tools">
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
						{settlements.envelopeOpenForSenderGovernance ? (
							<>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-8 gap-1.5 text-xs"
									onClick={() => settlements.openAttachDialog()}
								>
									Add payout
									<ProFeatureMark size="xs" />
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-8 gap-1.5 text-xs"
									disabled={!settlements.canChangeSigner}
									onClick={() => settlements.openAmendDialog()}
								>
									Change signer
									<ProFeatureMark size="xs" />
								</Button>
							</>
						) : null}
					</div>
					{governanceClosedCopy ? (
						<p className="mt-2 text-xs text-muted-foreground text-pretty">
							{governanceClosedCopy}
						</p>
					) : null}
					{settlements.envelopeOpenForSenderGovernance &&
					!settlements.canChangeSigner &&
					!settlements.paidSettlementLegs &&
					settlements.unsignedAmendOptions.length === 0 ? (
						<p className="mt-2 text-xs text-muted-foreground text-pretty">
							Every signer has already signed. Use Clear signatures to reopen
							roster changes.
						</p>
					) : null}
					{settlements.envelopeOpenForSenderGovernance &&
					settlements.paidSettlementLegs ? (
						<p className="mt-2 text-xs text-muted-foreground text-pretty">
							Change signer is unavailable after any payout leg has been paid.
						</p>
					) : null}
					<ConditionalAttachmentsPanel
						packets={file?.conditionalAttachmentPackets}
						signingStarted={signingStarted}
					/>
				</SignSidebar.Section>
			) : null}

			{file?.viewers && file.viewers.length > 0 ? (
				<SignSidebar.Section title="Viewers">
					<SignSidebar.SignersList
						signers={[]}
						signatures={undefined}
						viewers={file.viewers}
						signerAddress={signerAddress}
						formatAddress={formatAddress}
					/>
				</SignSidebar.Section>
			) : null}
		</div>
	);
}
