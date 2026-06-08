import { useEffect, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";

type DraftSaveDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultTitle: string;
	onConfirm: (title: string) => void;
	isSaving?: boolean;
};

export function DraftSaveDialog({
	open,
	onOpenChange,
	defaultTitle,
	onConfirm,
	isSaving = false,
}: DraftSaveDialogProps) {
	const [title, setTitle] = useState(defaultTitle);

	useEffect(() => {
		if (open) setTitle(defaultTitle);
	}, [open, defaultTitle]);

	const trimmed = title.trim();
	const canSave = trimmed.length > 0 && !isSaving;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Name this draft</DialogTitle>
					<DialogDescription>
						Give your draft a name so you can find it later. You can change this
						when you save again.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 py-2">
					<Label htmlFor="draft-save-title">Draft name</Label>
					<Input
						id="draft-save-title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Q1 vendor agreement"
						onKeyDown={(e) => {
							if (e.key === "Enter" && canSave) onConfirm(trimmed);
						}}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={!canSave}
						onClick={() => onConfirm(trimmed)}
					>
						{isSaving ? "Saving…" : "Save draft"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
