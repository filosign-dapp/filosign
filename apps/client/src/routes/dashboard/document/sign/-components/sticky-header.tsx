import {
	ArrowClockwiseIcon,
	ArrowLeftIcon,
	ArrowSquareOutIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CheckCircleIcon,
	DownloadIcon,
	FileArrowDownIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	ScrollIcon,
	SpinnerIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { SettlementHeaderBadge } from "@/src/routes/dashboard/document/sign/-components/settlement-header-badge";
import { SettlementRevokeAllowanceButton } from "@/src/routes/dashboard/document/sign/-components/settlement-revoke-allowance-button";
import { SignConfirmDialog } from "@/src/routes/dashboard/document/sign/-components/sign-confirm-dialog";
import {
	useSignColdShare,
	useSignCompliance,
	useSignFile,
	useSignIdentity,
	useSignMeta,
	useSignNavigation,
	useSignPlacement,
	useSignSettlements,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignDocumentStickyHeader() {
	const { navigate } = useSignNavigation();
	const { pieceCid, file } = useSignFile();
	const { signerAddress } = useSignIdentity();
	const { canSign, alreadySigned, signFile, handleSign } = useSignSigning();
	const { isSender, signedTxExplorerUrl, explorerLabel, formatAddress } =
		useSignMeta();
	const {
		zoom,
		handleZoomIn,
		handleZoomOut,
		isSigningPdf,
		signPdfPage,
		setSignPdfPage,
		signPdfTotalDisplay,
		fileData,
		docCanvasBusy,
	} = useSignViewer();
	const { canSubmitPlacementSign } = useSignPlacement();
	const docReady = Boolean(fileData) && !docCanvasBusy;
	const hasViewed = Boolean(file?.participantAccess?.firstViewedAt);
	const canSubmitSign = canSubmitPlacementSign && docReady && hasViewed;
	const {
		pdfExportBusy,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadDocumentWithCompliancePdf,
	} = useSignCompliance();
	const { executeRotateInvite, regenerateColdInvite } = useSignColdShare();
	const [rotateInviteOpen, setRotateInviteOpen] = useState(false);
	const [signConfirmOpen, setSignConfirmOpen] = useState(false);
	const {
		rules: settlementRules,
		revokePending,
		trySettlePending,
		manualSettlePending,
		onRevokeAllowance,
	} = useSignSettlements();
	const settlePending = trySettlePending || manualSettlePending;
	return (
		<>
			<div className="md:hidden">
				<div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigate({ to: "/dashboard" })}
						className="text-muted-foreground hover:text-foreground hover:bg-accent/50 -ml-2"
					>
						<ArrowLeftIcon className="size-4 mr-1.5" />
						<span className="text-sm">Back</span>
					</Button>
					<h2 className="text-sm flex items-center font-semibold truncate text-foreground max-w-[60%]">
						<span className="truncate">{pieceCid}</span>
						<CopyButton text={pieceCid} />
					</h2>
				</div>

				{(alreadySigned || settlementRules.length > 0) && (
					<div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
						<SettlementHeaderBadge rules={settlementRules} />
						<SettlementRevokeAllowanceButton
							rules={settlementRules}
							isSender={isSender}
							revokePending={revokePending}
							settlePending={settlePending}
							onRevokeAllowance={onRevokeAllowance}
						/>
						{alreadySigned ? (
							<>
								<Badge
									variant="secondary"
									className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
								>
									<CheckCircleIcon
										className="size-3.5 text-chart-2"
										weight="fill"
									/>
									Signed
								</Badge>
								{signedTxExplorerUrl ? (
									<a
										href={signedTxExplorerUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-xs font-medium text-ring hover:text-ring/90 hover:underline"
									>
										{explorerLabel}
										<ArrowSquareOutIcon className="size-3.5" />
									</a>
								) : (
									<span className="text-xs text-muted-foreground">
										On-chain proof recorded
									</span>
								)}
							</>
						) : null}
					</div>
				)}

				<div className="flex items-center justify-between px-3 py-2">
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleZoomOut}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
						>
							<MagnifyingGlassMinusIcon className="size-4" />
						</Button>
						<span className="text-xs font-medium min-w-10 text-center text-foreground">
							{zoom}%
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleZoomIn}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
						>
							<MagnifyingGlassPlusIcon className="size-4" />
						</Button>
						{isSigningPdf && (
							<>
								<div className="mx-0.5 h-5 w-px self-center bg-border/70" />
								<Button
									variant="ghost"
									size="sm"
									type="button"
									onClick={() => setSignPdfPage((p) => Math.max(1, p - 1))}
									disabled={signPdfPage <= 1}
									className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
									title="Previous page"
								>
									<CaretLeftIcon className="size-4" />
								</Button>
								<span className="min-w-10 text-center text-[10px] font-medium tabular-nums text-muted-foreground">
									{signPdfTotalDisplay == null
										? `${signPdfPage} / …`
										: `${signPdfPage} / ${signPdfTotalDisplay}`}
								</span>
								<Button
									variant="ghost"
									size="sm"
									type="button"
									onClick={() =>
										setSignPdfPage((p) =>
											signPdfTotalDisplay == null
												? p + 1
												: Math.min(signPdfTotalDisplay, p + 1),
										)
									}
									disabled={
										signPdfTotalDisplay != null &&
										signPdfPage >= signPdfTotalDisplay
									}
									className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
									title="Next page"
								>
									<CaretRightIcon className="size-4" />
								</Button>
							</>
						)}
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDownloadDocumentWithCompliancePdf}
							disabled={!fileData || pdfExportBusy}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
							title="Download document with proof"
						>
							<DownloadIcon className="size-5" />
						</Button>
						{isSender && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setRotateInviteOpen(true)}
								disabled={regenerateColdInvite.isPending}
								className="h-8 px-2 text-xs"
							>
								<ArrowClockwiseIcon className="mr-1 size-3.5" />
								Rotate
							</Button>
						)}

						{canSign && signerAddress && (
							<Button
								variant="primary"
								size="sm"
								onClick={() => setSignConfirmOpen(true)}
								disabled={signFile.isPending || !canSubmitSign}
							>
								{signFile.isPending ? (
									<>
										<SpinnerIcon className="size-4 animate-spin" />
										Signing…
									</>
								) : (
									"Sign"
								)}
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className="hidden md:flex items-center justify-between w-full px-6 py-3">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigate({ to: "/dashboard" })}
						className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
					>
						<ArrowLeftIcon className="size-4 mr-2" />
						Back
					</Button>
					<div className="flex gap-4">
						<div className="flex flex-col">
							<h2 className="text-sm flex items-center gap-1 font-semibold truncate text-foreground">
								<span className="truncate max-w-xs">{pieceCid}</span>
								<CopyButton text={pieceCid} />
							</h2>
							{file ? (
								<p className="text-xs text-muted-foreground flex items-center gap-1">
									From {formatAddress(file.sender)}
									<CopyButton text={formatAddress(file.sender)} />
								</p>
							) : (
								<Skeleton className="h-3 w-36" />
							)}
						</div>
						{(alreadySigned || settlementRules.length > 0) && (
							<div className="flex flex-wrap items-center gap-2 mt-2">
								<SettlementHeaderBadge rules={settlementRules} />
								{alreadySigned ? (
									<>
										<Badge
											variant="secondary"
											className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
										>
											<CheckCircleIcon
												className="size-3.5 text-chart-2"
												weight="fill"
											/>
											Signed
										</Badge>
										{signedTxExplorerUrl ? (
											<a
												href={signedTxExplorerUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 text-xs font-medium text-ring hover:text-ring/90 hover:underline"
											>
												{explorerLabel}
												<ArrowSquareOutIcon className="size-3.5" />
											</a>
										) : (
											<div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
												On-chain proof recorded
											</div>
										)}
									</>
								) : null}
							</div>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleZoomOut}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
						>
							<MagnifyingGlassMinusIcon className="size-5" />
						</Button>
						<span className="text-sm font-medium min-w-12 text-center text-foreground tabular-nums">
							{zoom}%
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleZoomIn}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
						>
							<MagnifyingGlassPlusIcon className="size-5" />
						</Button>
						{isSigningPdf && (
							<>
								<div className="mx-1 h-6 w-px bg-border" />
								<Button
									variant="ghost"
									size="sm"
									type="button"
									onClick={() => setSignPdfPage((p) => Math.max(1, p - 1))}
									disabled={signPdfPage <= 1}
									className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
									title="Previous page"
								>
									<CaretLeftIcon className="size-5" />
								</Button>
								<span className="min-w-11 text-center text-xs font-medium tabular-nums text-muted-foreground">
									{signPdfTotalDisplay == null
										? `${signPdfPage} / …`
										: `${signPdfPage} / ${signPdfTotalDisplay}`}
								</span>
								<Button
									variant="ghost"
									size="sm"
									type="button"
									onClick={() =>
										setSignPdfPage((p) =>
											signPdfTotalDisplay == null
												? p + 1
												: Math.min(signPdfTotalDisplay, p + 1),
										)
									}
									disabled={
										signPdfTotalDisplay != null &&
										signPdfPage >= signPdfTotalDisplay
									}
									className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
									title="Next page"
								>
									<CaretRightIcon className="size-5" />
								</Button>
							</>
						)}
					</div>

					<div className="w-px h-6 bg-border mx-2" />

					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDownload}
							disabled={!fileData}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
							title="Download file"
						>
							<FileArrowDownIcon className="size-5" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDownloadCompliancePdf}
							disabled={pdfExportBusy}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
							title="Download compliance report"
						>
							<ScrollIcon className="size-5" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDownloadDocumentWithCompliancePdf}
							disabled={!fileData || pdfExportBusy}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
							title="Download document with proof"
						>
							<DownloadIcon className="size-5" />
						</Button>

						{isSender && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setRotateInviteOpen(true)}
								disabled={regenerateColdInvite.isPending}
								className="h-8 gap-1.5"
								title="Rotate invite"
							>
								<ArrowClockwiseIcon className="size-4" />
								Rotate Invite
							</Button>
						)}
					</div>

					{canSign && signerAddress && (
						<>
							<div className="w-px h-6 bg-border mx-2" />
							<Button
								variant="primary"
								size="sm"
								onClick={() => setSignConfirmOpen(true)}
								disabled={signFile.isPending || !canSubmitSign}
							>
								{signFile.isPending ? (
									<>
										<SpinnerIcon className="size-4 animate-spin" />
										Signing…
									</>
								) : (
									"Sign document"
								)}
							</Button>
						</>
					)}
				</div>
			</div>
			<SignConfirmDialog
				open={signConfirmOpen}
				onOpenChange={setSignConfirmOpen}
				pending={signFile.isPending}
				onConfirm={() => handleSign()}
			/>
			<ConfirmAlertDialog
				open={rotateInviteOpen}
				onOpenChange={setRotateInviteOpen}
				title="Rotate invite?"
				description="Existing magic links and codes will stop working."
				confirmLabel="Rotate"
				destructive
				pending={regenerateColdInvite.isPending}
				onConfirm={() => executeRotateInvite()}
			/>
		</>
	);
}
