import { useEntitlements } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseAdvancedSettlements,
	canUseConditionalAttachmentRelease,
} from "@filosign/react/files";
import {
	normalizePlacementRecipientEmail,
	SUPPLEMENTARY_ATTACHMENT_LIMITS,
} from "@filosign/shared";
import { PaperclipIcon, TrashIcon, UploadIcon } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import { SettlementReleaseFields } from "@/src/lib/domains/settlements/settlement-release-fields";
import { createClientId } from "@/src/lib/utils/id";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	ACCEPTED_FILE_EXTENSIONS,
	ACCEPTED_FILE_MIME_SET,
	type AllowedFileMime,
} from "@/src/routes/dashboard/envelope/create/-lib/types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipients: Recipient[];
	existingDraft: AttachmentPacketComposeDraft | undefined;
	onSave: (draft: AttachmentPacketComposeDraft) => void;
};

function rosterRecipientOptions(recipients: Recipient[]) {
	return recipients
		.map((r) => {
			const raw = r.email?.trim();
			if (!raw || !isValidRecipientEmail(raw)) return null;
			return {
				email: normalizePlacementRecipientEmail(raw),
				label: r.name?.trim() || raw,
			};
		})
		.filter((x): x is NonNullable<typeof x> => x !== null);
}

function signerOptionsFromRecipients(recipients: Recipient[]) {
	return recipients
		.filter((r) => r.role === "signer")
		.map((r) => {
			const raw = r.email?.trim();
			if (!raw || !isValidRecipientEmail(raw)) return null;
			return {
				email: normalizePlacementRecipientEmail(raw),
				label: r.name?.trim() || raw,
			};
		})
		.filter((x): x is NonNullable<typeof x> => x !== null);
}

function initialAttachmentPacketDialogState(
	existingDraft: AttachmentPacketComposeDraft | undefined,
	recipients: Recipient[],
) {
	const rosterOptions = rosterRecipientOptions(recipients);
	const allRosterEmails = rosterOptions.map((r) => r.email);
	const signerOptions = signerOptionsFromRecipients(recipients);

	return {
		label: existingDraft?.label ?? "",
		releaseMode: existingDraft?.releaseMode ?? ("review" as const),
		releaseType: existingDraft?.releaseType ?? ("all_required_signed" as const),
		specificSignerEmail:
			existingDraft?.specificSignerEmail ?? signerOptions[0]?.email ?? "",
		thresholdN: String(existingDraft?.thresholdN ?? 2),
		selectedRecipients: existingDraft?.recipientEmails?.length
			? existingDraft.recipientEmails
			: allRosterEmails,
		files: existingDraft?.files ?? [],
	};
}

export function AttachmentPacketDialog({
	open,
	onOpenChange,
	recipients,
	existingDraft,
	onSave,
}: Props) {
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const canSelectRecipients = canSelectSupplementaryRecipients(entitlements);
	const canConditional = canUseConditionalAttachmentRelease(entitlements);
	const canAdvancedSettlements = canUseAdvancedSettlements(entitlements);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const rosterOptions = useMemo(
		() => rosterRecipientOptions(recipients),
		[recipients],
	);
	const allRosterEmails = useMemo(
		() => rosterOptions.map((r) => r.email),
		[rosterOptions],
	);
	const signerOptions = useMemo(
		() => signerOptionsFromRecipients(recipients),
		[recipients],
	);

	const initial = initialAttachmentPacketDialogState(existingDraft, recipients);
	const [label, setLabel] = useState(initial.label);
	const [releaseMode, setReleaseMode] = useState(initial.releaseMode);
	const [releaseType, setReleaseType] = useState(initial.releaseType);
	const [specificSignerEmail, setSpecificSignerEmail] = useState(
		initial.specificSignerEmail,
	);
	const [thresholdN, setThresholdN] = useState(initial.thresholdN);
	const [selectedRecipients, setSelectedRecipients] = useState(
		initial.selectedRecipients,
	);
	const [files, setFiles] = useState(initial.files);
	const [fileError, setFileError] = useState<string | null>(null);

	const handleFileSelect = async (fileList: FileList | null) => {
		if (!fileList) return;
		setFileError(null);
		const remaining =
			SUPPLEMENTARY_ATTACHMENT_LIMITS.maxFilesPerPacket - files.length;
		if (remaining <= 0) {
			setFileError(
				`At most ${SUPPLEMENTARY_ATTACHMENT_LIMITS.maxFilesPerPacket} files per packet`,
			);
			return;
		}

		const incoming = Array.from(fileList).slice(0, remaining);
		let nextError: string | null = null;
		const accepted: File[] = [];

		for (const file of incoming) {
			if (!ACCEPTED_FILE_MIME_SET.has(file.type as AllowedFileMime)) {
				nextError = `${file.name} must be a PDF`;
				continue;
			}
			if (file.size > SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile) {
				nextError = `${file.name} exceeds ${Math.round(SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile / (1024 * 1024))}MB`;
				continue;
			}
			accepted.push(file);
		}

		if (accepted.length === 0) {
			if (nextError) setFileError(nextError);
			return;
		}

		const readFiles = await Promise.all(
			accepted.map(async (file) => ({
				id: createClientId(),
				name: file.name,
				mimeType: file.type,
				bytes: new Uint8Array(await file.arrayBuffer()),
			})),
		);

		setFiles((prev) => [...prev, ...readFiles]);
		if (nextError) setFileError(nextError);
	};

	const toggleRecipient = (email: string, checked: boolean) => {
		if (!canSelectRecipients) {
			promptPlanUpgrade("features.supplementary_attachments.recipient_select");
			return;
		}
		setSelectedRecipients((prev) => {
			if (checked) return [...prev, email];
			return prev.filter((e) => e !== email);
		});
	};

	const handleSave = () => {
		if (files.length === 0) {
			setFileError("Add at least one file");
			return;
		}
		const recipientEmails = canSelectRecipients
			? selectedRecipients
			: allRosterEmails;
		if (recipientEmails.length === 0) {
			setFileError("Add recipients with valid emails first");
			return;
		}
		if (releaseMode === "conditional" && !canConditional) {
			promptPlanUpgrade(
				"features.supplementary_attachments.conditional_release",
			);
			return;
		}

		onSave({
			packetId: existingDraft?.packetId ?? createClientId(),
			label: label.trim() || undefined,
			releaseMode,
			releaseType,
			specificSignerEmail:
				releaseMode === "conditional" && releaseType === "specific_signer"
					? specificSignerEmail
					: undefined,
			thresholdN:
				releaseMode === "conditional" &&
				(releaseType === "at_least_n" ||
					releaseType === "quorum_required" ||
					releaseType === "quorum_set" ||
					releaseType === "quorum_all")
					? Number(thresholdN) || 1
					: undefined,
			recipientEmails,
			files,
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{existingDraft ? "Edit extra files" : "Add extra files"}
					</DialogTitle>
					<DialogDescription>
						Recipients unlock these based on the rules you set below.{" "}
						<DocsLink href={DOCS_LINKS.attachedFiles()}>
							Read the attached files guide
						</DocsLink>
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-1 max-h-[60vh] overflow-y-auto">
					<div className="grid gap-2">
						<Label htmlFor="attachment-packet-label">Label (optional)</Label>
						<Input
							id="attachment-packet-label"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder="e.g. Exhibits"
						/>
					</div>

					<div className="grid gap-2">
						<Label>Files</Label>
						<input
							ref={fileInputRef}
							type="file"
							accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
							multiple
							className="hidden"
							onChange={(e) => {
								void handleFileSelect(e.target.files);
								e.target.value = "";
							}}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-fit"
							onClick={() => fileInputRef.current?.click()}
							disabled={
								files.length >=
								SUPPLEMENTARY_ATTACHMENT_LIMITS.maxFilesPerPacket
							}
						>
							<UploadIcon className="size-4" weight="regular" />
							Upload PDF
						</Button>
						{files.length > 0 ? (
							<ul className="space-y-1">
								{files.map((file) => (
									<li
										key={file.id}
										className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5 text-sm"
									>
										<span className="flex min-w-0 items-center gap-2 truncate">
											<PaperclipIcon
												className="size-4 shrink-0 text-muted-foreground"
												weight="regular"
											/>
											{file.name}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											onClick={() =>
												setFiles((prev) => prev.filter((f) => f.id !== file.id))
											}
										>
											<TrashIcon className="size-4" weight="regular" />
										</Button>
									</li>
								))}
							</ul>
						) : (
							<p className="text-xs text-muted-foreground">
								Up to {SUPPLEMENTARY_ATTACHMENT_LIMITS.maxFilesPerPacket} PDFs,{" "}
								{Math.round(
									SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile /
										(1024 * 1024),
								)}
								MB each.
							</p>
						)}
						{fileError ? (
							<p className="text-xs text-destructive">{fileError}</p>
						) : null}
					</div>

					<div className="grid gap-2">
						<Label>Who can access</Label>
						{canSelectRecipients ? (
							<div className="space-y-2 rounded-lg border border-border/50 p-3">
								{rosterOptions.map((option) => (
									<label
										key={option.email}
										htmlFor={`attachment-recipient-${option.email}`}
										className="flex items-center gap-2 text-sm"
									>
										<Checkbox
											id={`attachment-recipient-${option.email}`}
											checked={selectedRecipients.includes(option.email)}
											onCheckedChange={(next) =>
												toggleRecipient(option.email, next === true)
											}
										/>
										<span>{option.label}</span>
									</label>
								))}
							</div>
						) : (
							<p className="text-xs text-muted-foreground">
								All recipients can access this packet.
							</p>
						)}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="attachment-release-mode">Unlock when</Label>
						<Select
							value={releaseMode}
							onValueChange={(value) => {
								if (value === "conditional" && !canConditional) {
									promptPlanUpgrade(
										"features.supplementary_attachments.conditional_release",
									);
									return;
								}
								if (value === "review" || value === "conditional") {
									setReleaseMode(value);
								}
							}}
						>
							<SelectTrigger id="attachment-release-mode">
								<SelectValue>
									{releaseMode === "review"
										? "Right after send"
										: "Conditions are met"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="review">Right after send</SelectItem>
								<SelectItem value="conditional">Conditions are met</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{releaseMode === "conditional" ? (
						<SettlementReleaseFields
							releaseType={releaseType}
							onReleaseTypeChange={setReleaseType}
							canAdvanced={canAdvancedSettlements}
							onRequireAdvanced={() =>
								promptPlanUpgrade("features.settlement.advanced")
							}
							specificSignerEmail={specificSignerEmail}
							onSpecificSignerEmailChange={setSpecificSignerEmail}
							signerOptions={signerOptions}
							thresholdN={thresholdN}
							onThresholdNChange={setThresholdN}
							releaseSelectId="attachment-release-type"
						/>
					) : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button type="button" onClick={handleSave}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
