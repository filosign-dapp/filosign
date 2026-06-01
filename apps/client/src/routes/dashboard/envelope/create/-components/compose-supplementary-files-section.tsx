import { useEntitlements } from "@filosign/react/billing";
import { canUseSupplementaryAttachments } from "@filosign/react/files";
import { SUPPLEMENTARY_ATTACHMENT_LIMITS } from "@filosign/shared";
import {
	PaperclipIcon,
	PencilSimpleIcon,
	PlusIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	type AttachmentPacketComposeDraft,
	attachmentPacketSummaryLabel,
} from "@/src/lib/domains/files/attachment-packet-compose";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { AttachmentPacketDialog } from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-dialog";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";

export function ComposeSupplementaryFilesSection() {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const canUse = canUseSupplementaryAttachments(entitlements);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	const drafts = createForm?.attachmentPacketDrafts ?? [];
	const editingDraft = useMemo(
		() => drafts.find((d) => d.packetId === editingId),
		[drafts, editingId],
	);

	if (!createForm) return null;

	const openAdd = () => {
		if (!canUse) {
			promptPlanUpgrade("features.supplementary_attachments");
			return;
		}
		if (
			drafts.length >= SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope
		) {
			return;
		}
		setEditingId(null);
		setDialogOpen(true);
	};

	const openEdit = (packetId: string) => {
		setEditingId(packetId);
		setDialogOpen(true);
	};

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

	const handleRemove = (packetId: string) => {
		setCreateForm({
			...createForm,
			attachmentPacketDrafts: drafts.filter((d) => d.packetId !== packetId),
		});
	};

	return (
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-sm font-semibold">Extra files</h2>
					<p className="text-xs text-muted-foreground">
						Optional files sent with the envelope. You choose who gets them and
						when.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="shrink-0"
					onClick={openAdd}
					disabled={
						drafts.length >=
						SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope
					}
				>
					<PlusIcon className="size-4" weight="regular" />
					Add files
				</Button>
			</div>

			{drafts.length > 0 ? (
				<ul className="space-y-2">
					{drafts.map((draft) => (
						<li
							key={draft.packetId}
							className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/50 p-3"
						>
							<div className="min-w-0 space-y-1">
								<p className="flex items-center gap-2 text-sm font-medium">
									<PaperclipIcon
										className="size-4 shrink-0 text-muted-foreground"
										weight="regular"
									/>
									<span className="truncate">
										{draft.label?.trim() || "File packet"}
									</span>
								</p>
								<p className="text-xs text-muted-foreground">
									{draft.files.length} file
									{draft.files.length !== 1 ? "s" : ""} ·{" "}
									{attachmentPacketSummaryLabel(draft)} ·{" "}
									{draft.recipientEmails.length} recipient
									{draft.recipientEmails.length !== 1 ? "s" : ""}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => openEdit(draft.packetId)}
									aria-label="Edit file packet"
								>
									<PencilSimpleIcon className="size-4" weight="regular" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => handleRemove(draft.packetId)}
									aria-label="Remove file packet"
								>
									<TrashIcon className="size-4" weight="regular" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			) : (
				<p className="text-xs text-muted-foreground">
					None yet. Up to{" "}
					{SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope} packets per
					envelope.
				</p>
			)}

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
