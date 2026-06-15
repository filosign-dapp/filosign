import { TextAlignLeftIcon } from "@phosphor-icons/react";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export function TemplateDefaultsPanel() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);

	if (!createForm) return null;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<TextAlignLeftIcon className="size-4 text-muted-foreground" />
				<h3 className="text-sm font-medium text-foreground">Default message</h3>
			</div>
			<p className="text-xs text-muted-foreground">
				Pre-fill the subject and message when someone uses this template.
			</p>
			<div className="space-y-3">
				<div className="space-y-2">
					<Label htmlFor="template-default-subject">Subject</Label>
					<Input
						id="template-default-subject"
						value={createForm.emailSubject ?? ""}
						maxLength={200}
						onChange={(event) =>
							setCreateForm({
								...createForm,
								emailSubject: event.target.value,
							})
						}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="template-default-message">Message</Label>
					<Textarea
						id="template-default-message"
						value={createForm.emailMessage ?? ""}
						rows={4}
						maxLength={5000}
						onChange={(event) =>
							setCreateForm({
								...createForm,
								emailMessage: event.target.value,
							})
						}
					/>
				</div>
			</div>
		</div>
	);
}
