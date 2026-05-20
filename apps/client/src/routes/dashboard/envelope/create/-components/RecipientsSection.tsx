import { useEnvelopeRecipientLimit } from "@filosign/react/billing";
import { useUserProfileByQuery } from "@filosign/react/users";
import {
	CaretDownIcon,
	CheckIcon,
	TrashIcon,
	UserIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
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
import type { Recipient } from "../-types";
import { usePromptPlanUpgrade } from "./entitlement-upgrade-context";
import { useRecipients } from "./envelope-draft-context";

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

export default function RecipientsSection() {
	const { value: recipients, onChange, error, showError } = useRecipients();
	const [isRecipientsOpen, setIsRecipientsOpen] = useState(true);
	const { canAddRecipient } = useEnvelopeRecipientLimit();
	const promptPlanUpgrade = usePromptPlanUpgrade();

	const recipientCount = recipients?.length ?? 0;

	const addRecipient = () => {
		if (!canAddRecipient(recipientCount)) {
			promptPlanUpgrade("envelope.recipients.max");
			return;
		}
		const next: Recipient = {
			clientRowId: crypto.randomUUID(),
			name: "",
			email: "",
			role: "signer",
		};
		onChange([...(recipients || []), next]);
	};

	const removeRecipient = (index: number) => {
		const updated = [...(recipients || [])];
		updated.splice(index, 1);
		onChange(updated);
	};

	const updateRecipient = (index: number, updates: Partial<Recipient>) => {
		const updated = [...(recipients || [])];
		updated[index] = { ...updated[index], ...updates };
		onChange(updated);
	};

	useEffect(() => {
		if (!recipients?.length) return;
		if (!recipients.some((r) => !r.clientRowId)) return;
		onChange(
			recipients.map((r) => ({
				...r,
				clientRowId: r.clientRowId ?? crypto.randomUUID(),
			})),
		);
	}, [recipients, onChange]);

	return (
		<motion.section
			className="space-y-4"
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 25,
				delay: 0.4,
			}}
		>
			<Collapsible open={isRecipientsOpen} onOpenChange={setIsRecipientsOpen}>
				<CollapsibleTrigger
					render={
						<button
							type="button"
							className="group/add-recipients -m-2 flex w-full cursor-pointer items-center justify-between rounded-lg border-0 bg-transparent p-2 text-left transition-colors hover:bg-muted/40"
						/>
					}
				>
					<h4 className="flex items-center gap-3 text-base font-semibold tracking-tight text-foreground">
						<span className="flex size-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors group-hover/add-recipients:bg-muted/70">
							<UsersIcon className="size-4" weight="regular" />
						</span>
						Add recipients
					</h4>
					<CaretDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isRecipientsOpen && "rotate-180",
						)}
						weight="bold"
					/>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6">
					<div className="space-y-5">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0 space-y-1">
								<p className="text-sm leading-relaxed text-muted-foreground">
									Add recipients by email.
								</p>
								{recipients && recipients.length > 0 ? (
									<p className="text-xs text-muted-foreground/80">
										{recipients.length} recipient
										{recipients.length !== 1 ? "s" : ""} added
									</p>
								) : null}
							</div>

							<div className="flex shrink-0 flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-1.5 border-border/60 bg-background text-foreground/90 shadow-none"
									onClick={addRecipient}
								>
									<UsersIcon className="size-4" weight="regular" />
									Add recipient
								</Button>
							</div>
						</div>

						{!recipients || recipients.length === 0 ? (
							<motion.div
								className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-8 py-12 text-center"
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									type: "spring",
									stiffness: 230,
									damping: 26,
								}}
							>
								<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
									<UsersIcon className="size-6" weight="regular" />
								</div>
								<p className="text-sm font-medium text-foreground/90">
									No recipients added
								</p>
								<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
									Click{" "}
									<span className="font-medium text-foreground/80">
										Add recipient
									</span>{" "}
									above, then enter their email.
								</p>
							</motion.div>
						) : (
							<CompactRecipientList
								recipients={recipients}
								onUpdateRecipient={updateRecipient}
								onRemoveRecipient={removeRecipient}
							/>
						)}

						{error && showError ? (
							<motion.p
								initial={{ opacity: 0, y: -6 }}
								animate={{ opacity: 1, y: 0 }}
								className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							>
								{error}
							</motion.p>
						) : null}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}

interface CompactRecipientListProps {
	recipients: Recipient[];
	onUpdateRecipient: (index: number, updates: Partial<Recipient>) => void;
	onRemoveRecipient: (index: number) => void;
}

function CompactRecipientList({
	recipients,
	onUpdateRecipient,
	onRemoveRecipient,
}: CompactRecipientListProps) {
	return (
		<motion.div
			className="space-y-3"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 26,
				delay: 0.06,
			}}
		>
			{recipients.map((recipient, index) => (
				<CompactRecipientCard
					key={recipient.clientRowId ?? `recipient-row-${index}`}
					recipient={recipient}
					index={index}
					onUpdate={onUpdateRecipient}
					onRemove={onRemoveRecipient}
				/>
			))}
		</motion.div>
	);
}

interface CompactRecipientCardProps {
	recipient: Recipient;
	index: number;
	onUpdate: (index: number, updates: Partial<Recipient>) => void;
	onRemove: (index: number) => void;
}

function CompactRecipientCard({
	recipient,
	index,
	onUpdate,
	onRemove,
}: CompactRecipientCardProps) {
	const [lookupEmail, setLookupEmail] = useState("");

	useEffect(() => {
		const t = window.setTimeout(() => {
			const raw = recipient.email.trim().toLowerCase();
			setLookupEmail(raw && isValidEmail(raw) ? raw : "");
		}, 450);
		return () => window.clearTimeout(t);
	}, [recipient.email]);

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
		if (Object.keys(patch).length > 0) onUpdate(index, patch);
	}, [
		queryEmail,
		profileQuery.isSuccess,
		profileQuery.data?.walletAddress,
		profileQuery.data?.firstName,
		profileQuery.data?.lastName,
		recipient.walletAddress,
		recipient.name,
		index,
		onUpdate,
	]);

	useEffect(() => {
		if (!queryEmail || profileQuery.isPending) return;
		if (profileQuery.isError && recipient.walletAddress) {
			onUpdate(index, { walletAddress: undefined });
		}
	}, [
		queryEmail,
		profileQuery.isPending,
		profileQuery.isError,
		recipient.walletAddress,
		index,
		onUpdate,
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
										onUpdate(index, {
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
										onUpdate(index, { role: val as Recipient["role"] })
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
									onChange={(e) => onUpdate(index, { name: e.target.value })}
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
										onClick={() => onRemove(index)}
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
