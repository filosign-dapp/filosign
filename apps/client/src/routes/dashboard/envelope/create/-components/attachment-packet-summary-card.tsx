import {
	isAdvancedSettlementReleaseType,
	normalizeSettlementReleaseType,
	type ReleaseCopyContext,
} from "@filosign/shared";
import { PaperclipIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import {
	type AttachmentPacketComposeDraft,
	attachmentPacketSummaryLabel,
} from "@/src/lib/domains/files/attachment-packet-compose";
import {
	ComposeRuleCard,
	ComposeRuleCardEditRemoveActions,
} from "@/src/routes/dashboard/envelope/create/-components/compose-rule-card";

type AttachmentPacketSummaryCardProps = {
	draft: AttachmentPacketComposeDraft;
	reviewLabel?: string;
	routingContext?: ReleaseCopyContext;
	compact?: boolean;
	showRecipientCount?: boolean;
	actions: ReactNode;
};

export function AttachmentPacketSummaryBody({
	draft,
	reviewLabel,
	routingContext,
	compact = false,
	showRecipientCount = false,
}: Pick<
	AttachmentPacketSummaryCardProps,
	"draft" | "reviewLabel" | "routingContext" | "compact" | "showRecipientCount"
>) {
	const releaseLabel = attachmentPacketSummaryLabel(
		draft,
		reviewLabel,
		routingContext,
	);
	const showProMark =
		draft.releaseMode === "conditional" ||
		isAdvancedSettlementReleaseType(
			normalizeSettlementReleaseType(draft.releaseType),
		);
	const textClass = compact ? "text-xs" : "text-sm";

	return (
		<>
			<p className={`inline-flex items-center gap-2 font-medium ${textClass}`}>
				{releaseLabel}
				{showProMark ? <ProFeatureMark size="xs" /> : null}
			</p>
			{draft.label?.trim() ? (
				<p className="text-xs text-muted-foreground">{draft.label.trim()}</p>
			) : null}
			<ul className="space-y-0.5 text-xs text-muted-foreground">
				{draft.files.map((file) => (
					<li
						key={file.id}
						className={compact ? "flex items-center gap-1.5" : "truncate"}
					>
						{compact ? (
							<PaperclipIcon className="size-3 shrink-0" weight="regular" />
						) : null}
						<span className="truncate">{file.name}</span>
					</li>
				))}
			</ul>
			{showRecipientCount ? (
				<p className="text-xs text-muted-foreground">
					{draft.recipientEmails.length} recipient
					{draft.recipientEmails.length !== 1 ? "s" : ""}
				</p>
			) : null}
		</>
	);
}

export function AttachmentPacketSummaryCard({
	draft,
	reviewLabel,
	routingContext,
	compact,
	showRecipientCount,
	actions,
}: AttachmentPacketSummaryCardProps) {
	return (
		<ComposeRuleCard actions={actions}>
			<AttachmentPacketSummaryBody
				draft={draft}
				reviewLabel={reviewLabel}
				routingContext={routingContext}
				compact={compact}
				showRecipientCount={showRecipientCount}
			/>
		</ComposeRuleCard>
	);
}

export function AttachmentPacketEditRemoveActions({
	onEdit,
	onRemove,
}: {
	onEdit: () => void;
	onRemove: () => void;
}) {
	return (
		<ComposeRuleCardEditRemoveActions
			onEdit={onEdit}
			onRemove={onRemove}
			editLabel="Edit file packet"
			removeLabel="Remove file packet"
		/>
	);
}
