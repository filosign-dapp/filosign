import type { ReactNode } from "react";
import { ColdShareDialog } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import {
	AmendSignerDialog,
	signerOptionsFromFile,
} from "@/src/routes/dashboard/document/sign/-components/amend-signer-dialog";
import { AttachSettlementDialog } from "@/src/routes/dashboard/document/sign/-components/attach-settlement-dialog";
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
import { SignSuccessDialog } from "./sign-success-dialog";
import { SignDocumentStickyHeader } from "./sticky-header";

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
