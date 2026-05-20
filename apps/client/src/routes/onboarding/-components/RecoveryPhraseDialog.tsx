import { CopySimpleIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";

type RecoveryPhraseDialogProps = {
	phrase: string | null;
	onConfirmSaved: () => void;
};

export function RecoveryPhraseDialog({
	phrase,
	onConfirmSaved,
}: RecoveryPhraseDialogProps) {
	const open = phrase !== null;

	const handleCopy = async () => {
		if (!phrase) return;
		try {
			await navigator.clipboard.writeText(phrase);
			toast.success("Recovery phrase copied");
		} catch {
			toast.error("Unable to copy recovery phrase");
		}
	};

	const handleDownload = () => {
		if (!phrase) return;
		const fileName = `filosign-recovery-phrase-${Date.now()}.txt`;
		const blob = new Blob([`Filosign Recovery Phrase\n\n${phrase}\n`], {
			type: "text/plain;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = fileName;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
		toast.success("Recovery phrase downloaded");
	};

	return (
		<Dialog open={open} onOpenChange={() => {}}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Save your recovery phrase</DialogTitle>
					<DialogDescription>
						This 24-word phrase is shown only once. Without it, if your wallet
						cannot unlock your session, you cannot recover this account.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="icon"
						type="button"
						onClick={() => void handleCopy()}
						aria-label="Copy recovery phrase"
						title="Copy recovery phrase"
					>
						<CopySimpleIcon className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						type="button"
						onClick={handleDownload}
						aria-label="Download recovery phrase as text file"
						title="Download recovery phrase as text file"
					>
						<DownloadSimpleIcon className="size-4" />
					</Button>
				</div>
				<div className="rounded-md border bg-muted p-3 text-sm leading-6">
					{phrase}
				</div>
				<DialogFooter className="flex-col gap-2 sm:flex-col">
					<Button
						type="button"
						onClick={onConfirmSaved}
						variant="primary"
						className="w-full"
					>
						I saved it
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
