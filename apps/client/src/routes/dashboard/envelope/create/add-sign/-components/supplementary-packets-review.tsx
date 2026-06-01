import { useEntitlements } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseConditionalAttachmentRelease,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { PaperclipIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	type AttachmentPacketComposeDraft,
	attachmentPacketSummaryLabel,
} from "@/src/lib/domains/files/attachment-packet-compose";
import {
	validateAttachmentPacketComposeDrafts,
	validateAttachmentPacketDraftsForSend,
} from "@/src/lib/domains/files/validate-attachment-packets";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { AttachmentPacketDialog } from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-dialog";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

export function SupplementaryPacketsReview() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const navigate = useNavigate();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	const drafts = createForm?.attachmentPacketDrafts ?? [];
	const editingDraft = useMemo(
		() => drafts.find((d) => d.packetId === editingId),
		[drafts, editingId],
	);

	const rosterEmails = useMemo(() => {
		const seen = new Set<string>();
		const out: string[] = [];
		for (const r of createForm?.recipients ?? []) {
			const raw = r.email?.trim();
			if (!raw || !isValidRecipientEmail(raw)) continue;
			const email = normalizePlacementRecipientEmail(raw);
			if (seen.has(email)) continue;
			seen.add(email);
			out.push(email);
		}
		return out;
	}, [createForm?.recipients]);

	const validationIssues = useMemo(() => {
		if (drafts.length === 0) return [];
		return [
			...validateAttachmentPacketDraftsForSend({
				supplementaryAttachments: canUseSupplementaryAttachments(entitlements),
				recipientSelect: canSelectSupplementaryRecipients(entitlements),
				conditionalRelease: canUseConditionalAttachmentRelease(entitlements),
				drafts,
				rosterEmails,
			}),
			...validateAttachmentPacketComposeDrafts({ drafts }),
		];
	}, [drafts, entitlements, rosterEmails]);

	if (!createForm || drafts.length === 0) return null;

	const handleSave = (draft: AttachmentPacketComposeDraft) => {
		const next = editingId
			? drafts.map((d) => (d.packetId === editingId ? draft : d))
			: [...drafts, draft];
		setCreateForm({
			...createForm,
			attachmentPacketDrafts: next,
		});
		setEditingId(null);
	};

	return (
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Supplementary files</h3>
					<p className="text-xs text-muted-foreground">
						{drafts.length} packet{drafts.length !== 1 ? "s" : ""} will be sent
						with this envelope.
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 shrink-0 text-xs"
					onClick={() => navigate({ to: "/dashboard/envelope/create" })}
				>
					Edit
				</Button>
			</div>

			<ul className="space-y-2">
				{drafts.map((draft) => (
					<li
						key={draft.packetId}
						className="flex items-start justify-between gap-2 rounded-md border border-border/40 px-2 py-1.5 text-xs"
					>
						<span className="flex min-w-0 items-start gap-2">
							<PaperclipIcon
								className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
								weight="regular"
							/>
							<span className="min-w-0">
								<span className="font-medium">
									{draft.label?.trim() || "Supplementary packet"}
								</span>
								<span className="block text-muted-foreground">
									{draft.files.length} file
									{draft.files.length !== 1 ? "s" : ""} ·{" "}
									{attachmentPacketSummaryLabel(draft, "After send")}
								</span>
							</span>
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => {
								setEditingId(draft.packetId);
								setDialogOpen(true);
							}}
						>
							<PencilSimpleIcon className="size-3.5" weight="regular" />
						</Button>
					</li>
				))}
			</ul>

			{validationIssues.length > 0 ? (
				<div className="rounded-md border border-destructive/25 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
					{validationIssues.map((issue) => (
						<p key={`${issue.code}-${issue.message}`}>{issue.message}</p>
					))}
				</div>
			) : null}

			{dialogOpen ? (
				<AttachmentPacketDialog
					key={editingId ?? "new"}
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					recipients={createForm.recipients}
					existingDraft={editingDraft}
					onSave={handleSave}
				/>
			) : null}
		</section>
	);
}
