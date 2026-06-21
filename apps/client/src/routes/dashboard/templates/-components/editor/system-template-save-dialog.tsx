import { useEffect, useRef, useState } from "react";
import { Badge } from "@/src/lib/components/ui/badge";
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
import { parseTagsInput } from "@/src/lib/domains/templates/utils/catalog-meta";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultName: string;
	defaultCategory?: string;
	defaultDocumentVersion?: string;
	defaultTags?: string[];
	isSaving: boolean;
	onConfirm: (args: {
		name: string;
		category: string;
		documentVersion: string;
		tags: string[];
	}) => void;
};

const EMPTY_DEFAULT_TAGS: string[] = [];

export function SystemTemplateSaveDialog({
	open,
	onOpenChange,
	defaultName,
	defaultCategory = "",
	defaultDocumentVersion = "v1",
	defaultTags = EMPTY_DEFAULT_TAGS,
	isSaving,
	onConfirm,
}: Props) {
	const [name, setName] = useState(defaultName);
	const [category, setCategory] = useState(defaultCategory);
	const [documentVersion, setDocumentVersion] = useState(
		defaultDocumentVersion,
	);
	const [tagsInput, setTagsInput] = useState(defaultTags.join(", "));
	const wasOpenRef = useRef(false);

	useEffect(() => {
		if (open && !wasOpenRef.current) {
			setName(defaultName);
			setCategory(defaultCategory);
			setDocumentVersion(defaultDocumentVersion);
			setTagsInput(defaultTags.join(", "));
		}
		wasOpenRef.current = open;
	}, [defaultCategory, defaultDocumentVersion, defaultName, defaultTags, open]);

	const tags = parseTagsInput(tagsInput);
	const canSave =
		name.trim().length > 0 &&
		category.trim().length > 0 &&
		documentVersion.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Save system template</DialogTitle>
					<DialogDescription>
						Library metadata for search and version labels on workspace
						installs.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="system-template-name">Name</Label>
						<Input
							id="system-template-name"
							value={name}
							maxLength={120}
							onChange={(event) => setName(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label
							htmlFor="system-template-version"
							title="Pinned on each workspace install; does not auto-update existing copies."
						>
							Catalog version
						</Label>
						<Input
							id="system-template-version"
							value={documentVersion}
							maxLength={64}
							placeholder="irs-2024"
							onChange={(event) => setDocumentVersion(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="system-template-category">Category</Label>
						<Input
							id="system-template-category"
							value={category}
							maxLength={64}
							placeholder="tax, contract, hr, …"
							onChange={(event) => setCategory(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="system-template-tags">Tags</Label>
						<Input
							id="system-template-tags"
							value={tagsInput}
							placeholder="w-9, withholding, irs"
							onChange={(event) => setTagsInput(event.target.value)}
						/>
						{tags.length > 0 ? (
							<div className="flex flex-wrap gap-1.5 pt-1">
								{tags.map((tag) => (
									<Badge key={tag} variant="secondary">
										{tag}
									</Badge>
								))}
							</div>
						) : null}
					</div>
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
						disabled={isSaving || !canSave}
						isLoading={isSaving}
						onClick={() =>
							onConfirm({
								name: name.trim(),
								category: category.trim(),
								documentVersion: documentVersion.trim(),
								tags,
							})
						}
					>
						Save template
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
