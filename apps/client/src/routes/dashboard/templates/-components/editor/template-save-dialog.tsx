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

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultName: string;
	isSaving: boolean;
	onConfirm: (name: string) => void;
};

export function TemplateSaveDialog({
	open,
	onOpenChange,
	defaultName,
	isSaving,
	onConfirm,
}: Props) {
	const [name, setName] = useState(defaultName);

	useEffect(() => {
		if (open) setName(defaultName);
	}, [defaultName, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Save template</DialogTitle>
					<DialogDescription>
						Name this blueprint for your workspace library.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 pt-2">
					<Label htmlFor="template-save-name">Template name</Label>
					<Input
						id="template-save-name"
						value={name}
						maxLength={120}
						autoFocus
						onChange={(event) => setName(event.target.value)}
					/>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={isSaving}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={isSaving || !name.trim()}
						isLoading={isSaving}
						onClick={() => onConfirm(name.trim())}
					>
						Save template
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
