import { useEntitlements } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseAdvancedSettlements,
	canUseConditionalAttachmentRelease,
} from "@filosign/react/files";
import type { SettlementReleaseType } from "@filosign/shared";
import {
	normalizePlacementRecipientEmail,
	normalizeSettlementReleaseType,
	releaseTypeHidesThresholdInput,
	resolveReleaseParamsForRouting,
	SUPPLEMENTARY_ATTACHMENT_LIMITS,
	validateReleaseParamsForRouting,
	validateSupplementaryAttachmentFile,
} from "@filosign/shared";
import { PaperclipIcon, TrashIcon, UploadIcon } from "@phosphor-icons/react";
import {
	type KeyboardEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import type {
	AttachmentPacketComposeDraft,
	AttachmentPacketComposeFile,
} from "@/src/lib/domains/files/attachment-packet-compose";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import type { RoutingContext } from "@/src/lib/domains/satellites/routing-context";
import { SettlementReleaseFields } from "@/src/lib/domains/settlements";
import { createClientId } from "@/src/lib/utils/id";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

const DEFAULT_RELEASE_TYPE: SettlementReleaseType = "all_signed";
const maxMb = Math.round(
	SUPPLEMENTARY_ATTACHMENT_LIMITS.maxBytesPerFile / (1024 * 1024),
);

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipients: Recipient[];
	routingContext: RoutingContext;
	existingPacketId?: string | null;
	existingDraft?: AttachmentPacketComposeDraft;
	onSave: (draft: AttachmentPacketComposeDraft) => void | Promise<void>;
	onRemove?: () => void;
	savePending?: boolean;
};

function defaultThresholdString(routing: RoutingContext): string {
	if (routing.quorumN > 0) return String(routing.quorumN);
	return "1";
}

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

function AttachmentPacketRecipientRow({
	option,
	checked,
	onCheckedChange,
}: {
	option: { email: string; label: string };
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
			<Checkbox
				id={`attachment-recipient-${option.email}`}
				checked={checked}
				onCheckedChange={(next) => onCheckedChange(next === true)}
				className="mt-0.5"
			/>
			<label
				htmlFor={`attachment-recipient-${option.email}`}
				className="min-w-0 flex-1 cursor-pointer text-sm font-medium"
			>
				{option.label}
			</label>
		</div>
	);
}

export function AttachmentPacketDialog({
	open,
	onOpenChange,
	recipients,
	routingContext,
	existingPacketId = null,
	existingDraft,
	onSave,
	onRemove,
	savePending = false,
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

	const [label, setLabel] = useState("");
	const [releaseMode, setReleaseMode] = useState<"review" | "conditional">(
		"review",
	);
	const [releaseType, setReleaseType] =
		useState<SettlementReleaseType>(DEFAULT_RELEASE_TYPE);
	const [specificSignerEmail, setSpecificSignerEmail] = useState("");
	const [thresholdN, setThresholdN] = useState(() =>
		defaultThresholdString(routingContext),
	);
	const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
	const [files, setFiles] = useState<AttachmentPacketComposeFile[]>([]);
	const [fileError, setFileError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setLabel(existingDraft?.label ?? "");
		setReleaseMode(existingDraft?.releaseMode ?? "review");
		setReleaseType(
			normalizeSettlementReleaseType(
				existingDraft?.releaseType ?? DEFAULT_RELEASE_TYPE,
			),
		);
		setSpecificSignerEmail(
			existingDraft?.specificSignerEmail ?? signerOptions[0]?.email ?? "",
		);
		setThresholdN(
			String(
				existingDraft?.thresholdN ??
					(routingContext.quorumN > 0 &&
					normalizeSettlementReleaseType(
						existingDraft?.releaseType ?? DEFAULT_RELEASE_TYPE,
					) === "quorum_required"
						? routingContext.quorumN
						: defaultThresholdString(routingContext)),
			),
		);
		setSelectedRecipients(
			existingDraft?.recipientEmails?.length
				? existingDraft.recipientEmails
				: allRosterEmails,
		);
		setFiles(existingDraft?.files ?? []);
		setFileError(null);
	}, [open, existingDraft, signerOptions, allRosterEmails, routingContext]);

	useEffect(() => {
		if (
			releaseType === "quorum_required" &&
			releaseTypeHidesThresholdInput(releaseType, routingContext)
		) {
			setThresholdN(String(routingContext.quorumN));
		}
	}, [releaseType, routingContext]);

	const recipientEmails = canSelectRecipients
		? selectedRecipients
		: allRosterEmails;

	const canSave =
		files.length > 0 &&
		recipientEmails.length > 0 &&
		!(
			releaseMode === "conditional" &&
			releaseType === "specific_signer" &&
			(!specificSignerEmail || signerOptions.length === 0)
		);

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
		const readFiles: AttachmentPacketComposeFile[] = [];

		for (const file of incoming) {
			const validated = validateSupplementaryAttachmentFile({
				name: file.name,
				sizeBytes: file.size,
				browserMime: file.type,
			});
			if (!validated.ok) {
				nextError = validated.message;
				continue;
			}
			readFiles.push({
				id: createClientId(),
				name: validated.sanitizedName,
				mimeType: validated.mimeType,
				bytes: new Uint8Array(await file.arrayBuffer()),
			});
		}

		if (readFiles.length === 0) {
			if (nextError) setFileError(nextError);
			return;
		}

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
		if (!canSave) {
			if (files.length === 0) setFileError("Add at least one file");
			return;
		}
		if (releaseMode === "conditional" && !canConditional) {
			promptPlanUpgrade(
				"features.supplementary_attachments.conditional_release",
			);
			return;
		}

		if (releaseMode === "conditional") {
			const validation = validateReleaseParamsForRouting({
				releaseType,
				thresholdN,
				routing: routingContext,
			});
			if (!validation.ok) {
				setFileError(validation.message);
				return;
			}
		}

		const resolvedThreshold =
			releaseMode === "conditional"
				? resolveReleaseParamsForRouting({
						releaseType,
						thresholdN,
						routing: routingContext,
					})
				: null;
		const resolvedThresholdN =
			resolvedThreshold &&
			"thresholdN" in resolvedThreshold &&
			typeof resolvedThreshold.thresholdN === "number"
				? resolvedThreshold.thresholdN
				: undefined;

		void Promise.resolve(
			onSave({
				packetId: existingPacketId ?? createClientId(),
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
						? (resolvedThresholdN ?? (Number(thresholdN) || 1))
						: undefined,
				recipientEmails,
				files,
			}),
		).then(() => onOpenChange(false));
	};

	const handleRemove = () => {
		onRemove?.();
		onOpenChange(false);
	};

	const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter" || event.defaultPrevented) return;
		if (event.target instanceof HTMLButtonElement) return;
		event.preventDefault();
		if (canSave) handleSave();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-lg"
				onKeyDown={handleDialogKeyDown}
			>
				<DialogHeader>
					<DialogTitle>
						{existingPacketId ? "Edit file packet" : "Add file packet"}
					</DialogTitle>
					<DialogDescription>
						Set when recipients can unlock files, who gets access, then upload
						files.{" "}
						<DocsLink href={DOCS_LINKS.attachedFiles()}>
							Attached files guide
						</DocsLink>
					</DialogDescription>
				</DialogHeader>

				<div className="grid max-h-[60vh] gap-4 overflow-y-auto py-1">
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
									<span className="inline-flex items-center gap-2">
										{releaseMode === "review"
											? "Right after send"
											: "Signing conditions are met"}
										{releaseMode === "conditional" ? (
											<ProFeatureMark size="xs" />
										) : null}
									</span>
								</SelectValue>
							</SelectTrigger>
							<SelectContent className="min-w-xs">
								<SelectItem value="review">Right after Send</SelectItem>
								<SelectItem value="conditional">
									<span className="inline-flex items-center gap-2">
										Signing conditions are met
										<ProFeatureMark size="xs" />
									</span>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{releaseMode === "conditional" ? (
						<SettlementReleaseFields
							releaseSelectId="attachment-release-type"
							releaseWhenLabel="Unlock when"
							specificSignerLabel="Which signer unlocks files"
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
							routingContext={routingContext}
						/>
					) : null}

					<div className="grid gap-2">
						<Label>Recipients</Label>
						{canSelectRecipients ? (
							<div className="space-y-2">
								{rosterOptions.map((option) => (
									<AttachmentPacketRecipientRow
										key={option.email}
										option={option}
										checked={selectedRecipients.includes(option.email)}
										onCheckedChange={(checked) =>
											toggleRecipient(option.email, checked)
										}
									/>
								))}
							</div>
						) : (
							<p className="rounded-lg border border-border/50 bg-background/50 p-3 text-xs text-muted-foreground">
								All recipients with valid emails can access this packet.
							</p>
						)}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="attachment-packet-label">Label (optional)</Label>
						<Input
							id="attachment-packet-label"
							variant="field"
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
							Upload files
						</Button>
						{files.length > 0 ? (
							<ul className="space-y-2">
								{files.map((file) => (
									<li
										key={file.id}
										className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm"
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
											aria-label={`Remove ${file.name}`}
										>
											<TrashIcon className="size-4" weight="regular" />
										</Button>
									</li>
								))}
							</ul>
						) : (
							<p className="text-xs text-muted-foreground">
								Up to {SUPPLEMENTARY_ATTACHMENT_LIMITS.maxFilesPerPacket} files,{" "}
								{maxMb}MB each.
							</p>
						)}
						{fileError ? (
							<p className="text-xs text-destructive">{fileError}</p>
						) : null}
					</div>

					<p className="text-xs text-muted-foreground">
						Files are encrypted for selected recipients before upload.
						Recipients confirm before download on the sign page.
					</p>
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					{existingPacketId && onRemove ? (
						<Button
							type="button"
							variant="ghost"
							className="text-destructive sm:mr-auto"
							onClick={handleRemove}
						>
							Remove packet
						</Button>
					) : (
						<span className="hidden sm:block sm:mr-auto" />
					)}
					<div className="flex gap-2 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!canSave || savePending}
							onClick={handleSave}
						>
							{savePending ? "Saving…" : "Save"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
