import {
	ArrowSquareOutIcon,
	CheckIcon,
	ClockIcon,
	ScrollIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { defaultChain } from "@/src/constants";
import { Button } from "@/src/lib/components/ui/button";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { ConditionalAttachmentsPanel } from "@/src/routes/dashboard/document/sign/-components/conditional-attachments-panel";
import { SettlementStatusPanel } from "@/src/routes/dashboard/document/sign/-components/settlement-status-panel";
import { SignEnvelopeProgressBanner } from "@/src/routes/dashboard/document/sign/-components/sign-envelope-progress";
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
		togglePlacementField,
		isMyPlacementFieldDone,
		canSubmitPlacementSign,
	} = useSignPlacement();
	const { canSign, alreadySigned } = useSignSigning();
	const { formatAddress, isSender } = useSignMeta();
	const {
		rules: settlementRules,
		walletAddress,
		canSettleByRuleId,
		trySettlePending,
		manualSettlePending,
		settlingRuleId,
		onTrySettleRule,
		onManualSettleRule,
		revokePending,
		onRevokeAllowance,
		canManageSettlements,
		onCancelRule,
		onUpdateRule,
		cancelPending,
		updatePending,
		canAttachSettlement,
		setAttachDialogOpen,
		setAmendDialogOpen,
	} = useSignSettlements();
	const signers = file?.signers ?? [];
	const signatures = file?.signatures;
	const viewers = file?.viewers;
	const envelopeProgress = file?.envelopeProgress;
	const canSignByRouting = file?.participantAccess?.canSignByRouting;

	return (
		<aside className="hidden lg:block w-72 border-l border-border bg-background overflow-y-auto">
			<div className="p-4 space-y-4">
				<h3 className="font-semibold text-sm flex items-center gap-2">
					<ScrollIcon className="size-4" />
					Signature Status
				</h3>

				<SignEnvelopeProgressBanner
					progress={envelopeProgress}
					canSignByRouting={canSignByRouting}
				/>

				{(canSign || alreadySigned) && myPlacementFields.length > 0 && (
					<div className="space-y-2 rounded-lg border border-border bg-muted/25 p-3">
						<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Your fields
						</h4>
						<p className="text-[11px] leading-snug text-muted-foreground">
							{alreadySigned
								? "Your signature is recorded. Field markers show where you signed."
								: "Tap the highlighted regions on the document (or the list below for other pages). Every required field must be marked before you can sign."}
						</p>
						<ul className="space-y-1.5">
							{myPlacementFields.map((field) => {
								const done = isMyPlacementFieldDone(field.id);
								return (
									<li
										key={field.id}
										className="flex items-center justify-between gap-2 text-xs"
									>
										<button
											type="button"
											disabled={alreadySigned}
											className={cn(
												"min-w-0 flex-1 truncate text-left underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-100",
												done &&
													(alreadySigned
														? "font-medium text-emerald-700 dark:text-emerald-400"
														: "text-muted-foreground line-through"),
											)}
											onClick={() => togglePlacementField(field.id)}
										>
											{field.type} · p.{field.pageIndex + 1}
											{field.required ? " · required" : ""}
											{alreadySigned && done ? " · signed" : ""}
										</button>
										{done ? (
											<CheckIcon
												className="size-3.5 shrink-0 text-emerald-600"
												weight="bold"
											/>
										) : (
											<ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
										)}
									</li>
								);
							})}
						</ul>
						{canSign && !canSubmitPlacementSign && (
							<p className="text-[11px] text-amber-800 dark:text-amber-200">
								Complete every required field to enable Sign.
							</p>
						)}
					</div>
				)}

				<div className="space-y-2 pt-2">
					{!file
						? Array.from({ length: 2 }).map((_, i) => (
								<Skeleton key={i} className="h-16 w-full rounded-lg" />
							))
						: null}
					{signers.map(
						(
							signer:
								| string
								| {
										wallet: string;
										name: string | null;
										email: string | null;
								  },
						) => {
							const signerWallet =
								typeof signer === "string" ? signer : signer.wallet;
							const signature = signatures?.find(
								(s) => s.signer.toLowerCase() === signerWallet.toLowerCase(),
							);
							const hasSigned = Boolean(signature);
							const isYou =
								signerAddress?.toLowerCase() === signerWallet.toLowerCase();
							const signerName =
								typeof signer === "string" ? null : signer.name;
							const signerEmail =
								typeof signer === "string" ? null : signer.email;
							const displayName = signerName || formatAddress(signerWallet);

							return (
								<div
									key={signerWallet}
									className={cn(
										"flex items-center gap-3 p-3 rounded-lg border",
										hasSigned
											? "bg-chart-2/10 border-chart-2/30"
											: "bg-muted/30 border-border",
									)}
								>
									<div
										className={cn(
											"size-8 rounded-full flex items-center justify-center shrink-0",
											hasSigned ? "bg-chart-2" : "bg-muted",
										)}
									>
										{hasSigned ? (
											<CheckIcon className="size-4 text-white" weight="bold" />
										) : (
											<ClockIcon className="size-4 text-muted-foreground" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{displayName}
											{isYou && (
												<span className="text-xs text-muted-foreground ml-1">
													(You)
												</span>
											)}
										</p>
										{signerEmail && (
											<p className="text-xs text-muted-foreground truncate">
												{signerEmail}
											</p>
										)}
										<p
											className={cn(
												"text-xs",
												hasSigned ? "text-chart-2" : "text-muted-foreground",
											)}
										>
											{hasSigned ? "Signed" : "Pending"}
										</p>
									</div>
									{signature?.onchainTxHash && (
										<a
											href={`${defaultChain.blockExplorers?.default?.url}/tx/${signature.onchainTxHash}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-muted-foreground hover:text-foreground"
											title="View on explorer"
										>
											<ArrowSquareOutIcon className="size-4" />
										</a>
									)}
								</div>
							);
						},
					)}
				</div>

				{isSender ? (
					<div className="flex flex-wrap gap-2">
						{canAttachSettlement ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => setAttachDialogOpen(true)}
							>
								Add payout
							</Button>
						) : null}
						{canManageSettlements ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => setAmendDialogOpen(true)}
							>
								Change signer
							</Button>
						) : null}
					</div>
				) : null}

				{isSender ? (
					<ConditionalAttachmentsPanel
						packets={file?.conditionalAttachmentPackets}
					/>
				) : null}

				<SettlementStatusPanel
					rules={settlementRules}
					formatAddress={formatAddress}
					isSender={isSender}
					walletAddress={walletAddress}
					canSettleByRuleId={canSettleByRuleId}
					trySettlePending={trySettlePending}
					manualSettlePending={manualSettlePending}
					settlingRuleId={settlingRuleId}
					onTrySettleRule={onTrySettleRule}
					onManualSettleRule={onManualSettleRule}
					revokePending={revokePending}
					onRevokeAllowance={onRevokeAllowance}
					canManageSettlements={canManageSettlements}
					onCancelRule={onCancelRule}
					onUpdateRule={onUpdateRule}
					cancelPending={cancelPending}
					updatePending={updatePending}
				/>

				{viewers && viewers.length > 0 && (
					<div className="pt-4 border-t border-border">
						<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
							Viewers ({viewers.length})
						</h4>
						<div className="space-y-2">
							{viewers.map(
								(
									viewer:
										| string
										| {
												wallet: string;
												name: string | null;
												email: string | null;
										  },
								) => {
									const viewerWallet =
										typeof viewer === "string" ? viewer : viewer.wallet;
									const viewerName =
										typeof viewer === "string" ? null : viewer.name;
									const viewerEmail =
										typeof viewer === "string" ? null : viewer.email;
									const displayName = viewerName || formatAddress(viewerWallet);

									return (
										<div
											key={viewerWallet}
											className="flex items-center gap-3 p-2 rounded-lg bg-muted/20"
										>
											<div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
												<UserIcon className="size-3 text-muted-foreground" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm text-muted-foreground truncate">
													{displayName}
													{signerAddress?.toLowerCase() ===
														viewerWallet.toLowerCase() && (
														<span className="text-xs ml-1">(You)</span>
													)}
												</p>
												{viewerEmail && (
													<p className="text-xs text-muted-foreground/70 truncate">
														{viewerEmail}
													</p>
												)}
											</div>
										</div>
									);
								},
							)}
						</div>
					</div>
				)}
			</div>
		</aside>
	);
}
