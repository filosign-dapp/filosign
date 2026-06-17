import { useEntitlements } from "@filosign/react/billing";
import { canUseSupplementaryAttachments } from "@filosign/react/files";
import { SUPPLEMENTARY_ATTACHMENT_LIMITS } from "@filosign/shared";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import {
	buildCreateForm,
	hydrateAttachmentPacketDrafts,
	saveAttachmentPacketDrafts,
} from "@/src/lib/domains/drafts";
import {
	type AttachmentPacketComposeDraft,
	removePacketById,
	upsertPacketDraft,
} from "@/src/lib/domains/files/attachment-packet-compose";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { AttachmentPacketDialog } from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-dialog";
import {
	AttachmentPacketEditRemoveActions,
	AttachmentPacketSummaryCard,
} from "@/src/routes/dashboard/envelope/create/-components/attachment-packet-summary-card";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";

export function ComposeSupplementaryFilesContent({
	recipients,
}: {
	recipients: Recipient[];
}) {
	const { form } = useCreateEnvelope();
	const formValues = form.state.values;
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const canUse = canUseSupplementaryAttachments(entitlements);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingPacketId, setEditingPacketId] = useState<string | null>(null);
	const [editingDraft, setEditingDraft] = useState<
		AttachmentPacketComposeDraft | undefined
	>();

	const drafts = createForm?.attachmentPacketDrafts ?? [];

	const ensureCreateForm = async () => {
		let draft = createForm ?? useStorePersist.getState().createForm;
		if (!draft) {
			draft = await buildCreateForm(formValues, null);
			setCreateForm(draft);
		}
		return draft;
	};

	const guardSupplementaryAccess = () => {
		if (canUse) return false;
		promptPlanUpgrade("features.supplementary_attachments");
		return true;
	};

	const openAdd = () => {
		if (guardSupplementaryAccess()) return;
		if (
			drafts.length >= SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope
		) {
			return;
		}
		setEditingDraft(undefined);
		setEditingPacketId(null);
		setDialogOpen(true);
	};

	const openEdit = async (packetId: string) => {
		if (guardSupplementaryAccess()) return;
		const draft = await ensureCreateForm();
		const packet = drafts.find((d) => d.packetId === packetId);
		if (!packet) return;
		const [hydrated] = await hydrateAttachmentPacketDrafts(draft.draftId, [
			packet,
		]);
		setEditingDraft(hydrated);
		setEditingPacketId(packetId);
		setDialogOpen(true);
	};

	const persistDrafts = async (next: AttachmentPacketComposeDraft[]) => {
		const draft = await ensureCreateForm();
		await saveAttachmentPacketDrafts(draft.draftId, next);
		setCreateForm({
			...draft,
			attachmentPacketDrafts: next,
		});
	};

	const handleSave = async (draft: AttachmentPacketComposeDraft) => {
		await persistDrafts(upsertPacketDraft(drafts, draft));
		setEditingPacketId(null);
		setEditingDraft(undefined);
	};

	const handleRemove = async (packetId: string) => {
		await persistDrafts(removePacketById(drafts, packetId));
		setEditingPacketId(null);
		setEditingDraft(undefined);
	};

	const atPacketLimit =
		drafts.length >= SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope;

	return (
		<>
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Attached file packets</h3>
					<p className="text-xs text-muted-foreground">
						Send encrypted PDF packets with your envelope. Set unlock rules,
						choose recipients, then add files.{" "}
						<DocsLink href={DOCS_LINKS.attachedFiles()}>
							Attached files guide
						</DocsLink>
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="shrink-0 gap-1.5"
					onClick={openAdd}
					disabled={atPacketLimit}
				>
					<PlusIcon className="size-4" weight="regular" />
					Add packet
				</Button>
			</div>

			{drafts.length > 0 ? (
				<ul className="space-y-2">
					{drafts.map((draft) => (
						<AttachmentPacketSummaryCard
							key={draft.packetId}
							draft={draft}
							showRecipientCount
							actions={
								<AttachmentPacketEditRemoveActions
									onEdit={() => void openEdit(draft.packetId)}
									onRemove={() => void handleRemove(draft.packetId)}
								/>
							}
						/>
					))}
				</ul>
			) : (
				<p className="text-xs text-muted-foreground">
					No file packets yet. Up to{" "}
					{SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope} packets per
					envelope.
				</p>
			)}

			{dialogOpen ? (
				<AttachmentPacketDialog
					open={dialogOpen}
					onOpenChange={(open) => {
						setDialogOpen(open);
						if (!open) {
							setEditingPacketId(null);
							setEditingDraft(undefined);
						}
					}}
					recipients={recipients}
					existingPacketId={editingPacketId}
					existingDraft={editingDraft}
					onSave={(draft) => void handleSave(draft)}
					onRemove={() => {
						if (editingPacketId) void handleRemove(editingPacketId);
					}}
				/>
			) : null}
		</>
	);
}
