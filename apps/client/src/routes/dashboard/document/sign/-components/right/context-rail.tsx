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

export function SignContextRail() {
	const { file } = useSignFile();
	const { signerAddress } = useSignIdentity();
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

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
			{settlements.pendingSignerReplacement ? (
				<div className="rounded-large border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-amber-100">
					<p className="font-semibold text-amber-800 dark:text-amber-200">
						Roster change pending
					</p>
					<p className="mt-1 leading-relaxed text-muted-foreground">
						{isSender
							? "Signing is frozen until you execute or cancel this change."
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
								onClick={() =>
									void settlements
										.onExecuteSignerReplacement()
										.catch(console.error)
								}
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
				/>
			</SignSidebar.Section>

			{isRevoked ? (
				<p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
					This envelope was voided on-chain and can no longer be signed.
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
							onClick={() => settlements.openAmendDialog()}
						>
							Change signer
							<ProFeatureMark size="xs" />
						</Button>
					</div>
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
