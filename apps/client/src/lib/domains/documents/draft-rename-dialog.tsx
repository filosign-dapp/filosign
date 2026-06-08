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

export function DraftRenameDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultTitle: string;
	onConfirm: (title: string) => void;
	pending?: boolean;
}) {
	const [title, setTitle] = useState(props.defaultTitle);

	useEffect(() => {
		if (props.open) setTitle(props.defaultTitle);
	}, [props.open, props.defaultTitle]);

	const trimmed = title.trim();
	const canSave = trimmed.length > 0 && !props.pending;

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Rename draft</DialogTitle>
					<DialogDescription>
						Update the name shown in your drafts list.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 py-2">
					<Label htmlFor="draft-rename-title">Draft name</Label>
					<Input
						id="draft-rename-title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Q1 vendor agreement"
						onKeyDown={(e) => {
							if (e.key === "Enter" && canSave) props.onConfirm(trimmed);
						}}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => props.onOpenChange(false)}
						disabled={props.pending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={!canSave}
						onClick={() => props.onConfirm(trimmed)}
					>
						{props.pending ? "Saving…" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
