import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";

type PdfAcroformImportDialogProps = {
	open: boolean;
	fieldCount: number;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
};

export function PdfAcroformImportDialog({
	open,
	fieldCount,
	onOpenChange,
	onConfirm,
}: PdfAcroformImportDialogProps) {
	if (fieldCount <= 0) return null;

	return (
		<ConfirmAlertDialog
			open={open}
			onOpenChange={onOpenChange}
			title={`Import ${fieldCount} PDF form field${fieldCount === 1 ? "" : "s"}?`}
			description="This PDF contains native form fields. Import them as Filosign placement fields assigned to the currently selected assignee. You can adjust positions before sending. Native PDF fields remain in the file."
			confirmLabel="Import fields"
			onConfirm={onConfirm}
		/>
	);
}
