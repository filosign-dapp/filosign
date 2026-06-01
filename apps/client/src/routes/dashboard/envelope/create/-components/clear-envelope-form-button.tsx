import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";

export function ClearEnvelopeFormButton() {
	const { clearForm, hasContent, isAdvancing } = useCreateEnvelope();
	const [open, setOpen] = useState(false);

	if (!hasContent) return null;

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="lg"
				className="gap-2 text-destructive hover:text-destructive"
				disabled={isAdvancing}
				onClick={() => setOpen(true)}
			>
				<TrashIcon className="size-4" />
				Clear form
			</Button>
			<ConfirmAlertDialog
				open={open}
				onOpenChange={setOpen}
				title="Clear this envelope?"
				description="Removes documents, recipients, and settings. This can't be undone."
				confirmLabel="Clear form"
				destructive
				onConfirm={clearForm}
			/>
		</>
	);
}
