import { settlementReleaseTypeLabel } from "@filosign/shared";
import {
	CheckCircleIcon,
	CurrencyDollarIcon,
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
import { useRecipientCard } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-recipient-card";
import { formatAttachedUsdcAmount } from "@/src/routes/dashboard/envelope/create/-lib/utils/filosign-profile";

export function RecipientCard({ index }: { index: number }) {
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

	if (!recipient) return null;

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
			>
				<div className="flex items-start gap-3 p-4">
					<Avatar className="size-9 shrink-0 border border-border/50">
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
									onValueChange={(role) =>
										updateRecipient(index, {
											role: role as "signer" | "viewer",
										})
									}
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
										{attachedDraft ? "Edit funds" : "Attach funds"}
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
