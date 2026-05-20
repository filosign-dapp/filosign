import { useUserProfileByQuery } from "@filosign/react/users";
import { CheckIcon, TrashIcon, UserIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
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
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

const EMPTY_USER_PROFILE_QUERY: {
	address?: Address;
	email?: string;
	username?: string;
} = {};

const FIELD_LABEL_CLASS = "text-xs font-normal text-muted-foreground";
const FIELD_CONTROL_CLASS =
	"h-9 border-border/60 bg-muted/5 text-sm text-foreground/90 shadow-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RecipientCard({ index }: { index: number }) {
	const { recipients, updateRecipient, removeRecipient } =
		useRecipientsContext();
	const recipient = recipients?.[index];
	const [lookupEmail, setLookupEmail] = useState("");

	useEffect(() => {
		if (!recipient) return;
		const t = window.setTimeout(() => {
			const raw = recipient.email.trim().toLowerCase();
			setLookupEmail(raw && isValidEmail(raw) ? raw : "");
		}, 450);
		return () => window.clearTimeout(t);
	}, [recipient?.email]);

	if (!recipient) return null;

	const normalizedInput = recipient.email.trim().toLowerCase();
	const queryEmail =
		lookupEmail &&
		lookupEmail === normalizedInput &&
		isValidEmail(normalizedInput)
			? lookupEmail
			: undefined;

	const profileQuery = useUserProfileByQuery(
		queryEmail ? { email: queryEmail } : EMPTY_USER_PROFILE_QUERY,
	);

	const invalidEmailSyntax =
		recipient.email.trim().length > 0 && !isValidEmail(recipient.email.trim());

	const isRegisteredOnFilosign = Boolean(queryEmail) && profileQuery.isSuccess;

	const flushEmailLookup = () => {
		const raw = recipient.email.trim().toLowerCase();
		setLookupEmail(raw && isValidEmail(raw) ? raw : "");
	};

	useEffect(() => {
		if (!queryEmail || !profileQuery.isSuccess || !profileQuery.data) return;

		const w = profileQuery.data.walletAddress;
		const displayName = [
			profileQuery.data.firstName,
			profileQuery.data.lastName,
		]
			.filter(Boolean)
			.join(" ")
			.trim();

		const patch: Partial<Recipient> = {};
		if (recipient.walletAddress !== w) patch.walletAddress = w;
		if (displayName && recipient.name !== displayName) patch.name = displayName;
		if (Object.keys(patch).length > 0) updateRecipient(index, patch);
	}, [
		queryEmail,
		profileQuery.isSuccess,
		profileQuery.data?.walletAddress,
		profileQuery.data?.firstName,
		profileQuery.data?.lastName,
		recipient.walletAddress,
		recipient.name,
		index,
		updateRecipient,
	]);

	useEffect(() => {
		if (!queryEmail || profileQuery.isPending) return;
		if (profileQuery.isError && recipient.walletAddress) {
			updateRecipient(index, { walletAddress: undefined });
		}
	}, [
		queryEmail,
		profileQuery.isPending,
		profileQuery.isError,
		recipient.walletAddress,
		index,
		updateRecipient,
	]);

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
			transition={{
				type: "spring",
				stiffness: 260,
				damping: 28,
			}}
		>
			<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
				<div className="relative shrink-0">
					<Avatar className="size-11 ring-1 ring-border/50">
						<AvatarFallback className="bg-muted/40 text-muted-foreground">
							{showAvatarUserIcon ? (
								<UserIcon className="size-5" weight="regular" aria-hidden />
							) : (
								<span className="text-xs font-medium tracking-tight">
									{avatarInitials}
								</span>
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
											"absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border border-emerald-500/25 bg-background text-emerald-600/90 shadow-sm transition-colors hover:bg-muted/50",
										)}
										aria-label="Filosign user"
									/>
								}
							>
								<CheckIcon className="size-3" weight="bold" aria-hidden />
							</TooltipTrigger>
							<TooltipContent side="top">Filosign User</TooltipContent>
						</Tooltip>
					) : null}
				</div>

				<div className="flex min-w-0 flex-1 gap-3">
					<div className="min-w-0 flex-1 space-y-3">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5 sm:col-span-2">
								<Label
									htmlFor={`recipient-email-${index}`}
									className={FIELD_LABEL_CLASS}
								>
									Email
								</Label>
								<Input
									id={`recipient-email-${index}`}
									type="email"
									autoComplete="email"
									value={recipient.email}
									onChange={(e) =>
										updateRecipient(index, {
											email: e.target.value,
											walletAddress: undefined,
										})
									}
									onBlur={flushEmailLookup}
									placeholder="name@example.com"
									className={FIELD_CONTROL_CLASS}
								/>
								{invalidEmailSyntax ? (
									<p className="text-xs text-destructive">Invalid email</p>
								) : null}
							</div>

							<div className="space-y-1.5">
								<Label
									htmlFor={`recipient-role-${index}`}
									className={FIELD_LABEL_CLASS}
								>
									Role
								</Label>
								<Select
									value={recipient.role}
									onValueChange={(val) =>
										updateRecipient(index, { role: val as Recipient["role"] })
									}
								>
									<SelectTrigger
										id={`recipient-role-${index}`}
										className={cn(FIELD_CONTROL_CLASS, "w-full")}
									>
										<SelectValue placeholder="Role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="signer">Signer</SelectItem>
										<SelectItem value="viewer">Viewer</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label
									htmlFor={`recipient-name-${index}`}
									className={FIELD_LABEL_CLASS}
								>
									Name{" "}
									<span className="text-muted-foreground/80">(optional)</span>
								</Label>
								<Input
									id={`recipient-name-${index}`}
									value={recipient.name}
									onChange={(e) =>
										updateRecipient(index, { name: e.target.value })
									}
									placeholder="Recipient name"
									className={FIELD_CONTROL_CLASS}
								/>
							</div>
						</div>
					</div>

					<div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
										aria-label="Remove recipient"
										onClick={() => removeRecipient(index)}
									/>
								}
							>
								<TrashIcon className="size-4" weight="regular" />
							</TooltipTrigger>
							<TooltipContent side="left">Remove</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
