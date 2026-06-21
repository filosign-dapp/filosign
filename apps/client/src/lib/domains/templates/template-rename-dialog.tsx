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

export function TemplateRenameDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultName: string;
	onConfirm: (name: string) => void;
	pending?: boolean;
}) {
	const [name, setName] = useState(props.defaultName);

	useEffect(() => {
		if (props.open) setName(props.defaultName);
	}, [props.open, props.defaultName]);

	const trimmed = name.trim();
	const canSave = trimmed.length > 0 && !props.pending;

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Rename template</DialogTitle>
					<DialogDescription>
						Update the name shown in your workspace templates list.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 py-2">
					<Label htmlFor="template-rename-name">Template name</Label>
					<Input
						id="template-rename-name"
						value={name}
						maxLength={120}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Standard NDA"
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
