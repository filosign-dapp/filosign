import { CheckIcon, TrashIcon, UserIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { Address } from "viem";
import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import { cn } from "@/src/lib/utils/utils";
import { initialsFromName } from "@/src/routes/dashboard/_shell/connections/-components/contact-utils";
import { useRecipientsContext } from "@/src/routes/dashboard/envelope/create/-lib/context/recipients-context";

const FIELD_LABEL_CLASS = "text-xs font-normal text-muted-foreground";

const RECIPIENT_ROLE_LABELS = {
	signer: "Signer",
	viewer: "Viewer",
} as const;

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RecipientCard({ index }: { index: number }) {
	const { recipients, updateRecipient, removeRecipient, profileByEmail } =
		useRecipientsContext();
	const recipient = recipients?.[index];

	if (!recipient) return null;

	const normalizedInput = recipient.email.trim().toLowerCase();
	const profile =
		normalizedInput && isValidEmail(normalizedInput)
			? profileByEmail.get(normalizedInput)
			: undefined;

	const invalidEmailSyntax =
		recipient.email.trim().length > 0 && !isValidEmail(recipient.email.trim());

	const isRegisteredOnFilosign = Boolean(profile?.walletAddress);

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
		>
			<div className="flex items-start gap-3 p-4">
				<div className="relative shrink-0">
					<Avatar className="size-9 border border-border/50">
						<AvatarFallback className="bg-muted/30 text-xs font-medium text-muted-foreground">
							{showAvatarUserIcon ? (
								<UserIcon className="size-4" />
							) : (
								avatarInitials
							)}
						</AvatarFallback>
					</Avatar>
					{isRegisteredOnFilosign ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<button
										type="button"
										className={cn(
											"absolute -bottom-1.5 -right-1 flex size-5 items-center justify-center rounded-full border border-emerald-500/25 bg-background text-emerald-600/90 shadow-sm transition-colors hover:bg-muted/50",
										)}
										aria-label="Filosign user"
									/>
								}
							>
								<CheckIcon className="size-3" weight="bold" aria-hidden />
							</TooltipTrigger>
							<TooltipContent side="top">
								{profile?.walletAddress
									? `Wallet: ${(profile.walletAddress as Address).slice(0, 6)}…`
									: "Filosign user"}
							</TooltipContent>
						</Tooltip>
					) : null}
				</div>

				<div className="min-w-0 flex-1 space-y-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label
								className={FIELD_LABEL_CLASS}
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
							<Label className={FIELD_LABEL_CLASS}>Name</Label>
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
								className={FIELD_LABEL_CLASS}
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
		</motion.div>
	);
}
