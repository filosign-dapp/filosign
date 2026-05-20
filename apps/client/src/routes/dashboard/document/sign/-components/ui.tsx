import type { ReactNode } from "react";
import {
	type SignDocumentContextValue,
	SignDocumentProvider,
	useSignColdShare,
	useSignDocumentContext,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { ColdShareDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/cold-share-dialog";
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

export const Sign = {
	Root: SignRoot,
	Shell: SignShell,
	Dialogs: function SignDialogs() {
		return (
			<>
				<SignColdShareDialog />
				<SignSuccessDialogSlot />
			</>
		);
	},
};
