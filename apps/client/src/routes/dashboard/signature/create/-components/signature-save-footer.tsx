import { Button } from "@/src/lib/components/ui/button";
import { useSignatureCreate } from "@/src/routes/dashboard/signature/create/-lib/context/context";

interface SignatureSaveFooterProps {
	saveDisabled: boolean;
}

export function SignatureSaveFooter({
	saveDisabled,
}: SignatureSaveFooterProps) {
	const { handleCreateSignature, handleGoBack, isSavingChoose } =
		useSignatureCreate();

	return (
		<div className="mx-auto flex w-full max-w-6xl justify-end gap-4">
			<Button
				variant="ghost"
				size="lg"
				disabled={isSavingChoose}
				onClick={handleGoBack}
			>
				Go Back
			</Button>
			<Button
				variant="primary"
				size="lg"
				onClick={handleCreateSignature}
				disabled={saveDisabled || isSavingChoose}
				isLoading={isSavingChoose}
			>
				{isSavingChoose ? "Saving…" : "Save Changes"}
			</Button>
		</div>
	);
}
