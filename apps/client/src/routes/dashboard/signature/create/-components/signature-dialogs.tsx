import { useSignatureCreate } from "@/src/routes/dashboard/signature/create/-lib/context/context";
import SignatureDialog from "./signature-dialog";

export function SignatureDialogs() {
	const {
		isSignatureDialogOpen,
		setIsSignatureDialogOpen,
		isInitialsDialogOpen,
		setIsInitialsDialogOpen,
		handleSignatureSave,
		handleInitialsSave,
	} = useSignatureCreate();

	return (
		<>
			<SignatureDialog
				isOpen={isSignatureDialogOpen}
				onClose={() => setIsSignatureDialogOpen(false)}
				onSave={handleSignatureSave}
				title="Draw Your Signature"
				role="signature"
			/>
			<SignatureDialog
				isOpen={isInitialsDialogOpen}
				onClose={() => setIsInitialsDialogOpen(false)}
				onSave={handleInitialsSave}
				title="Draw Your Initials"
				role="initial"
			/>
		</>
	);
}
