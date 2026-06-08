import { useEntitlements } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseConditionalAttachmentRelease,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
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
import {
	validateAttachmentPacketComposeDrafts,
	validateAttachmentPacketDraftsForSend,
} from "@/src/lib/domains/files/validate-attachment-packets";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { AttachmentPacketDialog } from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-dialog";
import { AttachmentPacketSummaryCard } from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-summary-card";
import { rosterEmailsFromRecipients } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/validate";

export function SupplementaryPacketsReview() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const navigate = useNavigate();
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
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-4">
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Attached file packets</h3>
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

			{hydrating ? (
				<p className="flex items-center gap-2 text-xs text-muted-foreground">
					<InlineLoader className="size-3.5" />
					Loading file packets…
				</p>
			) : null}

			{hydrateError ? (
				<p className="text-xs text-destructive">{hydrateError}</p>
			) : null}

			<ul className="space-y-2">
				{drafts.map((draft) => (
					<AttachmentPacketSummaryCard
						key={draft.packetId}
						draft={draft}
						reviewLabel="After send"
						compact
						actions={
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={hydrating}
								onClick={() => void openEdit(draft.packetId)}
								aria-label="Edit file packet"
							>
								<PencilSimpleIcon className="size-3.5" weight="regular" />
							</Button>
						}
					/>
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
