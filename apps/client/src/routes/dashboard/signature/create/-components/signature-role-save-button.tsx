import type { UserSignatureRole } from "@filosign/shared";
import { Button } from "@/src/lib/components/ui/button";
import { useSignatureCreate } from "@/src/routes/dashboard/signature/create/-lib/context/context";

const SAVE_LABEL: Record<UserSignatureRole, string> = {
	signature: "Save signature",
	initial: "Save initials",
};

interface SignatureRoleSaveButtonProps {
	signatureRole: UserSignatureRole;
	disabled?: boolean;
}

export function SignatureRoleSaveButton({
	signatureRole,
	disabled = false,
}: SignatureRoleSaveButtonProps) {
	const { handleSaveDrawOrUploadRole, savingRole } = useSignatureCreate();
	const isSaving = savingRole === signatureRole;
	const isBusy = savingRole !== null;

	return (
		<div className="flex justify-end">
			<Button
				variant="primary"
				size="sm"
				onClick={() => handleSaveDrawOrUploadRole(signatureRole)}
				disabled={disabled || isBusy}
				isLoading={isSaving}
			>
				{isSaving ? "Saving…" : SAVE_LABEL[signatureRole]}
			</Button>
		</div>
	);
}
