import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useEntitlements } from "@filosign/react/billing";
import { canUseAdvancedRouting } from "@filosign/react/files";
import { settlementReleaseTypeLabel } from "@filosign/shared";
import {
	CheckCircleIcon,
	CurrencyDollarIcon,
	DotsSixVerticalIcon,
	TrashIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
} from "@/src/lib/components/ui/avatar";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { initialsFromName } from "@/src/routes/dashboard/_shell/connections/-components/contact-utils";
import { RecipientSettlementDialog } from "@/src/routes/dashboard/envelope/create/-components/recipient-settlement-dialog";
import {
	RECIPIENT_FIELD_LABEL_CLASS,
	RECIPIENT_ROLE_LABELS,
} from "@/src/routes/dashboard/envelope/create/-lib/constants/recipient-card";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { useRecipientCard } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-recipient-card";
import { formatAttachedUsdcAmount } from "@/src/routes/dashboard/envelope/create/-lib/utils/filosign-profile";

type RecipientCardDragHandleProps = {
	turnIndex?: number;
	dragHandleRef?: (element: HTMLElement | null) => void;
	dragHandleListeners?: SyntheticListenerMap;
	dragHandleAttributes?: DraggableAttributes;
	isDragging?: boolean;
};

type RecipientCardProps = {
	index: number;
} & RecipientCardDragHandleProps;

export function RecipientCard({
	index,
	turnIndex,
	dragHandleRef,
	dragHandleListeners,
	dragHandleAttributes,
	isDragging,
}: RecipientCardProps) {
	const {
		recipient,
		allRecipients,
		updateRecipient,
		removeRecipient,
		attachedDraft,
		invalidEmailSyntax,
		isFilosignRecipient,
		canAttachFunds,
		settlementDialogOpen,
		setSettlementDialogOpen,
		saveSettlementDraft,
		removeSettlementDraft,
	} = useRecipientCard(index);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const advancedRouting = canUseAdvancedRouting(entitlements);

	if (!recipient) return null;

	const isRequiredSigner =
		recipient.role !== "signer" || recipient.signerRequired !== false;

	const showAvatarUserIcon = !recipient.name.trim() && !recipient.email.trim();
	const avatarInitials = initialsFromName(
		recipient.name,
		recipient.email || "?",
	);

	return (
		<>
			<motion.div
				className="overflow-hidden rounded-xl border border-border/60 bg-muted/5 shadow-none"
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				style={isDragging ? { opacity: 0.65 } : undefined}
			>
				<div className="flex items-stretch gap-3 p-4">
					{turnIndex != null && dragHandleRef ? (
						<button
							type="button"
							ref={dragHandleRef}
							className="flex w-7 shrink-0 cursor-grab touch-none flex-col items-center py-0.5 text-muted-foreground active:cursor-grabbing"
							aria-label={`Drag to reorder turn ${turnIndex}`}
							{...dragHandleAttributes}
							{...dragHandleListeners}
						>
							<DotsSixVerticalIcon className="size-5 shrink-0" weight="bold" />
							<div className="my-1 w-px flex-1 bg-border/70" aria-hidden />
							<Badge
								variant="secondary"
								className="size-5 shrink-0 justify-center px-0 text-[10px] font-semibold tabular-nums"
							>
								{turnIndex}
							</Badge>
						</button>
					) : null}

					<Avatar className="size-9 shrink-0 self-start border border-border/50">
						<AvatarFallback className="bg-muted/30 text-xs font-medium text-muted-foreground">
							{showAvatarUserIcon ? (
								<UserIcon className="size-4" />
							) : (
								avatarInitials
							)}
						</AvatarFallback>
						{isFilosignRecipient ? (
							<AvatarBadge
								className="size-4 bg-chart-2 text-white ring-background"
								title="Filosign user"
							>
								<CheckCircleIcon className="size-3" weight="fill" />
							</AvatarBadge>
						) : null}
					</Avatar>

					<div className="min-w-0 flex-1 space-y-3">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label
									className={RECIPIENT_FIELD_LABEL_CLASS}
									htmlFor={`recipient-email-${index}`}
								>
									Email
								</Label>
								<Input
									variant="field"
									type="email"
									id={`recipient-email-${index}`}
									value={recipient.email}
									onChange={(e) =>
										updateRecipient(index, { email: e.target.value })
									}
									placeholder="email@example.com"
									aria-invalid={invalidEmailSyntax}
								/>
							</div>
							<div className="space-y-1.5">
								<Label className={RECIPIENT_FIELD_LABEL_CLASS}>Name</Label>
								<Input
									variant="field"
									value={recipient.name}
									onChange={(e) =>
										updateRecipient(index, { name: e.target.value })
									}
									placeholder="Full name"
								/>
							</div>
						</div>

						{canAttachFunds && attachedDraft ? (
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="font-normal">
									USDC {formatAttachedUsdcAmount(attachedDraft.amountUsdc)} ·{" "}
									{settlementReleaseTypeLabel(attachedDraft.releaseType)}
								</Badge>
								<Button
									type="button"
									variant="link"
									size="sm"
									className="h-auto px-0 text-xs"
									onClick={() => setSettlementDialogOpen(true)}
								>
									Edit
								</Button>
							</div>
						) : null}

						<div className="flex flex-wrap items-end justify-between gap-3">
							<div className="space-y-1.5">
								<Label
									className={RECIPIENT_FIELD_LABEL_CLASS}
									htmlFor={`recipient-role-${index}`}
								>
									Role
								</Label>
								<Select
									value={recipient.role}
									onValueChange={(role) => {
										const nextRole = role as "signer" | "viewer";
										updateRecipient(index, {
											role: nextRole,
											...(nextRole === "viewer"
												? { signerRequired: undefined }
												: {}),
										});
									}}
								>
									<SelectTrigger
										id={`recipient-role-${index}`}
										size="sm"
										className="min-w-36"
									>
										<SelectValue>
											{RECIPIENT_ROLE_LABELS[recipient.role]}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="signer">
											{RECIPIENT_ROLE_LABELS.signer}
										</SelectItem>
										<SelectItem value="viewer">
											{RECIPIENT_ROLE_LABELS.viewer}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex shrink-0 items-center gap-1">
								{canAttachFunds ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setSettlementDialogOpen(true)}
									>
										<CurrencyDollarIcon className="size-4" weight="regular" />
										{attachedDraft ? "Edit payout" : "Add payout"}
									</Button>
								) : null}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="text-muted-foreground"
									onClick={() => removeRecipient(index)}
									aria-label="Remove recipient"
								>
									<TrashIcon className="size-4" />
								</Button>
							</div>
						</div>

						{recipient.role === "signer" ? (
							<label
								htmlFor={`recipient-required-${index}`}
								className="flex items-start gap-2 text-sm"
							>
								<Checkbox
									id={`recipient-required-${index}`}
									className="mt-0.5"
									checked={isRequiredSigner}
									onCheckedChange={(next) => {
										if (next !== true && !advancedRouting) {
											promptPlanUpgrade("features.routing.advanced");
											return;
										}
										updateRecipient(index, {
											signerRequired: next === true,
										});
									}}
								/>
								<span className="text-muted-foreground leading-snug">
									Required
								</span>
							</label>
						) : null}
					</div>
				</div>
			</motion.div>

			{canAttachFunds ? (
				<RecipientSettlementDialog
					open={settlementDialogOpen}
					onOpenChange={setSettlementDialogOpen}
					recipient={recipient}
					allRecipients={allRecipients}
					existingDraft={attachedDraft}
					onSave={saveSettlementDraft}
					onRemove={removeSettlementDraft}
				/>
			) : null}
		</>
	);
}
