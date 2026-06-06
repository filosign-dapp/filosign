import { useFilosignContext } from "@filosign/react";
import { useCreateOrgTemplate } from "@filosign/react/orgs";
import { useState } from "react";
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
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	serverDraftId: string | undefined;
	initialName: string;
};

export function DraftTemplateDialog({
	open,
	onOpenChange,
	serverDraftId,
	initialName,
}: Props) {
	const { rpc } = useFilosignContext();
	const createTemplate = useCreateOrgTemplate();
	const [templateName, setTemplateName] = useState(initialName);
	const [templateSaving, setTemplateSaving] = useState(false);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (next) setTemplateName(initialName);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Save as Template</DialogTitle>
					<DialogDescription>
						Create a reusable template for your workspace from this draft.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="designer-template-name">Template Name</Label>
						<Input
							id="designer-template-name"
							placeholder="E.g. Standard NDA"
							value={templateName}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setTemplateName(e.target.value)
							}
							maxLength={120}
							autoFocus
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={templateSaving}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						onClick={async () => {
							if (!templateName.trim()) {
								toast.error("Please enter a template name");
								return;
							}
							setTemplateSaving(true);
							try {
								const draftDetails = await rpc.drafts.get({
									draftId: serverDraftId || "",
								});
								if (
									!draftDetails.documents ||
									draftDetails.documents.length === 0
								) {
									throw new Error("This draft has no PDF document uploaded.");
								}
								if (!draftDetails.headDekWrappedOmk) {
									throw new Error(
										"Please save the draft first to generate encryption keys.",
									);
								}
								const primaryDoc = draftDetails.documents[0];
								const placementManifest = {
									version: 1 as const,
									documents: [],
									fields: [],
								};

								await createTemplate.mutateAsync({
									name: templateName.trim(),
									s3Key: primaryDoc.s3Key,
									dekWrappedOmk: draftDetails.headDekWrappedOmk || "",
									placementManifest,
								});
								toast.success("Saved as template!");
								onOpenChange(false);
								setTemplateName("");
							} catch (err) {
								toast.error(
									err instanceof Error
										? err.message
										: "Failed to save template",
								);
							} finally {
								setTemplateSaving(false);
							}
						}}
						disabled={templateSaving || !templateName.trim()}
					>
						{templateSaving ? "Saving..." : "Save Template"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
