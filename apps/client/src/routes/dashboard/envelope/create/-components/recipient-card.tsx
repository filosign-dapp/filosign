import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
	CheckIcon,
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
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/src/lib/components/ui/hover-card";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { recipientComposeEmailDisplay } from "@/src/lib/domains/templates/template-composer";
import { initialsFromName } from "@/src/lib/utils/display-name";
import { FilosignRecipientHoverCard } from "@/src/routes/dashboard/envelope/create/-components/filosign-recipient-hover-card";
import {
	RECIPIENT_FIELD_LABEL_CLASS,
	RECIPIENT_ROLE_LABELS,
} from "@/src/routes/dashboard/envelope/create/-lib/constants/recipient-card";
import { useRecipientCard } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-recipient-card";

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
		updateRecipient,
		removeRecipient,
		invalidEmailSyntax,
		isFilosignRecipient,
		isSelfRecipient,
		profile,
	} = useRecipientCard(index);
	if (!recipient) return null;

	const showAvatarUserIcon = !recipient.name.trim() && !recipient.email.trim();
	const avatarInitials = initialsFromName(
		recipient.name,
		recipient.email || "?",
	);

	return (
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

				{isFilosignRecipient ? (
					<HoverCard>
						<HoverCardTrigger
							delay={0}
							closeDelay={0}
							render={
								<span className="inline-flex shrink-0 self-start rounded-full" />
							}
						>
							<Avatar className="size-9 border border-border/50">
								<AvatarFallback className="bg-muted/30 text-xs font-medium text-muted-foreground">
									{showAvatarUserIcon ? (
										<UserIcon className="size-4" />
									) : (
										avatarInitials
									)}
								</AvatarFallback>
								<AvatarBadge className="bg-secondary text-secondary-foreground ring-background">
									<CheckIcon className="size-full" />
								</AvatarBadge>
							</Avatar>
						</HoverCardTrigger>
						<HoverCardContent
							side="right"
							align="start"
							sideOffset={8}
							className="w-60 p-3"
						>
							<FilosignRecipientHoverCard
								recipient={recipient}
								profile={profile}
							/>
						</HoverCardContent>
					</HoverCard>
				) : (
					<Avatar className="size-9 shrink-0 self-start border border-border/50">
						<AvatarFallback className="bg-muted/30 text-xs font-medium text-muted-foreground">
							{showAvatarUserIcon ? (
								<UserIcon className="size-4" />
							) : (
								avatarInitials
							)}
						</AvatarFallback>
					</Avatar>
				)}

				<div className="min-w-0 flex-1 space-y-3">
					{recipient.templateRoleLabel ? (
						<div className="flex items-center gap-2">
							<Badge variant="secondary">{recipient.templateRoleLabel}</Badge>
							<span className="text-xs text-muted-foreground">
								Template role
							</span>
						</div>
					) : null}
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
								value={recipientComposeEmailDisplay(recipient.email)}
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
									if (nextRole === "viewer" && isSelfRecipient) return;
									updateRecipient(index, { role: nextRole });
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
									{isSelfRecipient ? null : (
										<SelectItem value="viewer">
											{RECIPIENT_ROLE_LABELS.viewer}
										</SelectItem>
									)}
								</SelectContent>
							</Select>
							{isSelfRecipient ? (
								<p className="text-xs text-muted-foreground">
									You can sign, but not view-only, on your own envelope.
								</p>
							) : null}
						</div>

						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="shrink-0 text-muted-foreground"
							onClick={() => removeRecipient(index)}
							aria-label="Remove recipient"
						>
							<TrashIcon className="size-4" />
						</Button>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
