import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { SignConfirmDialog } from "@/src/routes/dashboard/document/sign/-components/confirm-dialog";
import {
	useSignColdShare,
	useSignSettlements,
	useSignSigning,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { useSignHeaderUi } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-header-ui";

export function SignHeaderDialogs() {
	const { signFile, handleSign } = useSignSigning();
	const { rules: settlementRules } = useSignSettlements();
	const { executeRotateInvite, regenerateColdInvite } = useSignColdShare();
	const {
		rotateInviteOpen,
		setRotateInviteOpen,
		signConfirmOpen,
		setSignConfirmOpen,
	} = useSignHeaderUi();

	return (
		<>
			<SignConfirmDialog
				open={signConfirmOpen}
				onOpenChange={setSignConfirmOpen}
				pending={signFile.isPending}
				requiresPayoutAck={settlementRules.length > 0}
				onConfirm={(result) => void handleSign(result)}
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
