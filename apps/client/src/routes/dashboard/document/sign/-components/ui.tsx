import type { ReactNode } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { ColdShareDialog } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import {
	AmendSignerDialog,
	signerOptionsFromFile,
} from "@/src/routes/dashboard/document/sign/-components/amend-signer-dialog";
import { AttachSettlementDialog } from "@/src/routes/dashboard/document/sign/-components/attach-settlement-dialog";
import { ClearEnvelopeSignaturesDialog } from "@/src/routes/dashboard/document/sign/-components/clear-envelope-signatures-dialog";
import { RecallEnvelopeDialog } from "@/src/routes/dashboard/document/sign/-components/recall-envelope-dialog";
import { SettlementUpdateDialog } from "@/src/routes/dashboard/document/sign/-components/settlement-update-dialog";
import {
	type SignDocumentContextValue,
	SignDocumentProvider,
	useSignColdShare,
	useSignDocumentContext,
	useSignFile,
	useSignSettlements,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { SignDocumentBody } from "./body";
import { SignDocumentShell } from "./shell";
import { SignDocumentSidebar } from "./sidebar";
import { SignDocumentStickyHeader } from "./sticky-header";
import { SignSuccessDialog } from "./success-dialog";

function SignRoot({
	value,
	children,
}: {
	value: SignDocumentContextValue;
	children: ReactNode;
}) {
	return <SignDocumentProvider value={value}>{children}</SignDocumentProvider>;
}

function SignShell({ children }: { children: ReactNode }) {
	return (
		<SignDocumentShell
			stickyHeader={<SignDocumentStickyHeader />}
			body={
				<>
					<SignDocumentBody />
					<SignDocumentSidebar />
				</>
			}
		>
			{children}
		</SignDocumentShell>
	);
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

function SignSettlementDialogs() {
	const { file } = useSignFile();
	const settlements = useSignSettlements();
	const signerOptions = signerOptionsFromFile(file?.signers ?? []);

	return (
		<>
			<SettlementUpdateDialog
				open={settlements.updateDialogOpen}
				onOpenChange={settlements.setUpdateDialogOpen}
				rule={settlements.updateRuleTarget}
				onConfirm={settlements.onConfirmUpdateRule}
				pending={settlements.updatePending}
			/>
			{settlements.pendingSignerReplacement ? (
				<div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
					<p className="font-medium">Roster change pending</p>
					<p className="mt-1 text-muted-foreground">
						Signing is frozen until you execute or cancel this change.
					</p>
					<div className="mt-2 flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant="primary"
							className="h-7 text-xs"
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
							className="h-7 text-xs"
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
				</div>
			) : null}
			<AmendSignerDialog
				open={settlements.amendDialogOpen}
				onOpenChange={settlements.setAmendDialogOpen}
				signers={signerOptions}
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
			<AttachSettlementDialog
				open={settlements.attachDialogOpen}
				onOpenChange={settlements.setAttachDialogOpen}
				payees={settlements.attachPayeeOptions}
				signerEmails={
					file?.signers
						?.map((s) => s.email)
						.filter((e): e is string => Boolean(e)) ?? []
				}
				onConfirm={settlements.onConfirmAttachSettlement}
				pending={settlements.attachPending}
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
				<SignSuccessDialogSlot />
				<SignSettlementDialogs />
			</>
		);
	},
};
