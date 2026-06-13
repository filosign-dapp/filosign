import { useEntitlements } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseConditionalAttachmentRelease,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { validateAttachmentPacketDraftsForSend } from "@filosign/shared";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import {
	hydrateAttachmentPacketDrafts,
	saveAttachmentPacketDrafts,
	useHydrateAttachmentPacketDrafts,
} from "@/src/lib/domains/drafts";
import {
	type AttachmentPacketComposeDraft,
	removePacketById,
	upsertPacketDraft,
} from "@/src/lib/domains/files/attachment-packet-compose";
import { validateAttachmentPacketComposeDrafts } from "@/src/lib/domains/files/validate-attachment-packets";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { AttachmentPacketDialog } from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-dialog";
import { AttachmentPacketSummaryBody } from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-summary-card";
import { rosterEmailsFromRecipients } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/validate";

export function SupplementaryPacketsSidebar() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingDraft, setEditingDraft] = useState<
		AttachmentPacketComposeDraft | undefined
	>();

	const drafts = createForm?.attachmentPacketDrafts ?? [];
	const { hydrating, hydrateError } = useHydrateAttachmentPacketDrafts(
		createForm?.draftId,
		drafts,
	);

	const editingDraftFromStore = useMemo(
		() => drafts.find((d) => d.packetId === editingId),
		[drafts, editingId],
	);

	const rosterEmails = useMemo(
		() => rosterEmailsFromRecipients(createForm?.recipients ?? []),
		[createForm?.recipients],
	);

	const validationIssues = useMemo(() => {
		if (drafts.length === 0 || hydrating) return [];
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
	}, [drafts, entitlements, rosterEmails, hydrating]);

	if (!createForm || drafts.length === 0) return null;

	const openEdit = async (packetId: string) => {
		const draft = drafts.find((d) => d.packetId === packetId);
		if (!draft) return;
		const [hydrated] = await hydrateAttachmentPacketDrafts(createForm.draftId, [
			draft,
		]);
		setEditingDraft(hydrated);
		setEditingId(packetId);
		setDialogOpen(true);
	};

	const handleSave = async (draft: AttachmentPacketComposeDraft) => {
		const next = upsertPacketDraft(drafts, draft);
		await saveAttachmentPacketDrafts(createForm.draftId, next);
		setCreateForm({
			...createForm,
			attachmentPacketDrafts: next,
		});
		setEditingId(null);
		setEditingDraft(undefined);
	};

	const handleRemove = async (packetId: string) => {
		const next = removePacketById(drafts, packetId);
		await saveAttachmentPacketDrafts(createForm.draftId, next);
		setCreateForm({
			...createForm,
			attachmentPacketDrafts: next,
		});
		setEditingId(null);
		setEditingDraft(undefined);
	};

	return (
		<section className="mt-6 border-t border-border pt-4">
			<div className="mb-3 px-1">
				<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					File packets
				</p>
				<p className="mt-1 text-[11px] text-muted-foreground">
					{drafts.length} packet{drafts.length !== 1 ? "s" : ""} attached
				</p>
			</div>

			{hydrating ? (
				<p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
					<InlineLoader className="size-3.5" />
					Loading…
				</p>
			) : null}

			{hydrateError ? (
				<p className="px-1 text-xs text-destructive">{hydrateError}</p>
			) : null}

			<ul className="space-y-1">
				{drafts.map((draft) => (
					<li key={draft.packetId}>
						<div className="group flex items-start gap-2 rounded-md px-1.5 py-2 transition-colors hover:bg-muted/40">
							<div className="min-w-0 flex-1 space-y-0.5">
								<AttachmentPacketSummaryBody
									draft={draft}
									reviewLabel="After send"
									compact
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
								disabled={hydrating}
								onClick={() => void openEdit(draft.packetId)}
								aria-label="Edit file packet"
							>
								<PencilSimpleIcon className="size-3.5" weight="regular" />
							</Button>
						</div>
					</li>
				))}
			</ul>

			{validationIssues.length > 0 ? (
				<div className="mt-2 rounded-md border border-destructive/25 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
					{validationIssues.map((issue) => (
						<p key={`${issue.code}-${issue.message}`}>{issue.message}</p>
					))}
				</div>
			) : null}

			{dialogOpen ? (
				<AttachmentPacketDialog
					open={dialogOpen}
					onOpenChange={(open) => {
						setDialogOpen(open);
						if (!open) {
							setEditingId(null);
							setEditingDraft(undefined);
						}
					}}
					recipients={createForm.recipients}
					existingPacketId={editingId}
					existingDraft={editingDraft ?? editingDraftFromStore}
					onSave={(draft) => void handleSave(draft)}
					onRemove={() => {
						if (editingId) void handleRemove(editingId);
					}}
				/>
			) : null}
		</section>
	);
}
