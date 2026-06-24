import { NotePencilIcon } from "@phosphor-icons/react";
import { SettingsSection } from "@/src/lib/components/settings/section";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";

export function PayoutAccessReviewNote(props: {
	reviewNote: string;
	onReviewNoteChange: (value: string) => void;
	error: string | null;
}) {
	return (
		<SettingsSection
			icon={<NotePencilIcon className="size-4" aria-hidden />}
			title="Review note"
			description="Optional internal note saved with approve or reject decisions."
		>
			<div className="space-y-2 max-w-2xl">
				<Label htmlFor="payout-review-note" className="sr-only">
					Review note
				</Label>
				<Textarea
					id="payout-review-note"
					value={props.reviewNote}
					onChange={(e) => props.onReviewNoteChange(e.target.value)}
					placeholder="Internal note saved with approve/reject decisions…"
					rows={2}
				/>
				{props.error ? (
					<p className="text-xs text-destructive">{props.error}</p>
				) : null}
			</div>
		</SettingsSection>
	);
}
