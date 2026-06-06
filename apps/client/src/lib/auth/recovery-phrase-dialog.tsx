import { CopySimpleIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";

export type RecoveryPhraseDialogCopy = {
	title: string;
	description: string;
	confirmLabel: string;
};

const onboardingCopy: RecoveryPhraseDialogCopy = {
	title: "Save your recovery phrase",
	description:
		"This 24-word phrase is shown only once. Without it, if your wallet cannot unlock your session, you cannot recover this account.",
	confirmLabel: "I saved it",
};

const profileExportCopy: RecoveryPhraseDialogCopy = {
	title: "Export recovery phrase",
	description:
		"Your recovery phrase is derived from your wallet on this device. Store it somewhere safe — Filosign never stores it on our servers.",
	confirmLabel: "Done",
};

type RecoveryPhraseDialogProps = {
	phrase: string | null;
	onConfirmSaved: () => void;
	variant?: "onboarding" | "profile-export";
	copy?: Partial<RecoveryPhraseDialogCopy>;
};

export function RecoveryPhraseDialog({
	phrase,
	onConfirmSaved,
	variant = "onboarding",
	copy,
}: RecoveryPhraseDialogProps) {
	const open = phrase !== null;
	const baseCopy =
		variant === "profile-export" ? profileExportCopy : onboardingCopy;
	const resolvedCopy = { ...baseCopy, ...copy };

	const handleCopy = async () => {
		if (!phrase) return;
		try {
			await navigator.clipboard.writeText(phrase);
		} catch {}
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
	};

	return (
		<Dialog open={open} onOpenChange={() => {}}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>{resolvedCopy.title}</DialogTitle>
					<DialogDescription>{resolvedCopy.description}</DialogDescription>
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
						{resolvedCopy.confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
