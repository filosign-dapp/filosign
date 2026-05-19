import { useFilosignContext } from "@filosign/react";
import { useEnvelopeRecipientLimit } from "@filosign/react/billing";
import { useUserProfileByQuery } from "@filosign/react/users";
import { computeSignerNetPayout, validateInvoiceMemo } from "@filosign/shared";
import {
	CaretDownIcon,
	CheckIcon,
	CoinsIcon,
	TrashIcon,
	UserIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
	type Address,
	erc20Abi,
	formatUnits,
	getAddress,
	parseUnits,
} from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { defaultChain, SUPPORTED_TOKENS } from "@/src/constants";
import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
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
import { Textarea } from "@/src/lib/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import { useWalletTopUp } from "@/src/lib/hooks/use-wallet-top-up";
import { safeAsync } from "@/src/lib/utils/safe";
import { cn } from "@/src/lib/utils/utils";
import { initialsFromName } from "@/src/pages/dashboard/connections/_components/contact-utils";
import type { Recipient } from "../../types";
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
	const isCheckingProfile = Boolean(queryEmail) && profileQuery.isPending;

	const usdc = SUPPORTED_TOKENS[0];
	const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

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

	const shouldClearInvoice =
		invalidEmailSyntax || (Boolean(queryEmail) && profileQuery.isError);

	useEffect(() => {
		if (!recipient.invoice?.token) return;
		if (isCheckingProfile) return;
		if (isRegisteredOnFilosign) return;
		if (profileQuery.isError || shouldClearInvoice) {
			onUpdate(index, { invoice: { token: "", amount: "", memo: "" } });
			setInvoiceDialogOpen(false);
		}
	}, [
		isCheckingProfile,
		isRegisteredOnFilosign,
		profileQuery.isError,
		shouldClearInvoice,
		recipient.invoice?.token,
		index,
		onUpdate,
	]);

	const hasInvoice =
		Boolean(recipient.invoice?.token?.trim()) &&
		Boolean(recipient.invoice?.amount?.trim());

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

						<div className="flex flex-wrap items-center gap-2">
							{hasInvoice ? (
								<Badge
									variant="secondary"
									className="h-5 gap-1 border border-border/50 bg-muted/40 px-2 text-[10px] font-medium text-foreground/85"
								>
									<CoinsIcon className="size-3" weight="fill" />
									{recipient.invoice?.amount || "0"} USD · {usdc.symbol}
								</Badge>
							) : null}
							{isRegisteredOnFilosign ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="gap-1.5 border-border/60 shadow-none"
									onClick={() => setInvoiceDialogOpen(true)}
								>
									<CoinsIcon className="size-3.5" weight="regular" />
									{hasInvoice ? "Edit invoice" : "Attach invoice"}
								</Button>
							) : null}
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

			<InvoiceAttachDialog
				open={invoiceDialogOpen}
				onOpenChange={setInvoiceDialogOpen}
				recipient={recipient}
				onSave={(invoice) => onUpdate(index, { invoice })}
				onClear={() => {
					onUpdate(index, { invoice: { token: "", amount: "", memo: "" } });
					setInvoiceDialogOpen(false);
				}}
			/>
		</motion.div>
	);
}

interface InvoiceAttachDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipient: Recipient;
	onSave: (invoice: NonNullable<Recipient["invoice"]>) => void;
	onClear: () => void;
}

function InvoiceAttachDialog({
	open,
	onOpenChange,
	recipient,
	onSave,
	onClear,
}: InvoiceAttachDialogProps) {
	const usdc = SUPPORTED_TOKENS[0];
	const tokenAddress = usdc.address as Address;
	const { runtime } = useFilosignContext();
	const platformFeeBps = runtime.platformFeeBps ?? 0;
	const { address } = useAccount();
	const chainId = useChainId();
	const { openTopUp } = useWalletTopUp();

	const wrongChain = chainId !== defaultChain.id;
	const balanceQueryEnabled = open && Boolean(address) && !wrongChain;

	const [amount, setAmount] = useState("");
	const [memo, setMemo] = useState("");
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setFormError(null);
		const inv = recipient.invoice;
		setAmount(inv?.amount?.trim() || "");
		setMemo(inv?.memo ?? "");
	}, [
		open,
		recipient.invoice?.amount,
		recipient.invoice?.memo,
		recipient.invoice?.token,
	]);

	const {
		data: balance,
		isFetching: balanceFetching,
		isPending: balancePending,
		isError: balanceIsError,
		error: balanceQueryError,
		refetch,
	} = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: { enabled: balanceQueryEnabled },
	});

	const balanceReady =
		balanceQueryEnabled &&
		!balancePending &&
		!balanceIsError &&
		balance !== undefined;

	const parsedAmountWei = useMemo(() => {
		const trimmed = amount.trim();
		if (!trimmed) return null;
		try {
			return parseUnits(trimmed, usdc.decimals);
		} catch {
			return null;
		}
	}, [amount, usdc.decimals]);

	const amountExceedsBalance =
		balanceReady &&
		parsedAmountWei !== null &&
		parsedAmountWei > 0n &&
		parsedAmountWei > balance;

	const signerNetLabel = useMemo(() => {
		if (!parsedAmountWei || parsedAmountWei <= 0n || platformFeeBps <= 0) {
			return null;
		}
		const net = computeSignerNetPayout(parsedAmountWei, platformFeeBps);
		return Number(formatUnits(net, usdc.decimals)).toLocaleString(undefined, {
			maximumFractionDigits: 6,
		});
	}, [parsedAmountWei, platformFeeBps, usdc.decimals]);

	const saveBlockedByBalance = !balanceReady || amountExceedsBalance;

	const handleSave = () => {
		setFormError(null);
		let normalizedMemo: string;
		try {
			normalizedMemo = validateInvoiceMemo(memo).normalized;
		} catch (e) {
			setFormError(e instanceof Error ? e.message : "Invalid memo");
			return;
		}
		const trimmed = amount.trim();
		if (!trimmed) {
			setFormError("Enter an amount in USD");
			return;
		}
		let amountWei: bigint;
		try {
			amountWei = parseUnits(trimmed, usdc.decimals);
		} catch {
			setFormError("Enter a valid USD amount");
			return;
		}
		if (amountWei <= 0n) {
			setFormError("Amount must be greater than zero");
			return;
		}
		if (!balanceReady) {
			setFormError(
				"Your USDC balance must load before you can save. Connect your wallet, use the correct network, then tap Refresh.",
			);
			return;
		}
		if (amountWei > balance) {
			setFormError("Amount exceeds your USDC balance.");
			return;
		}
		onSave({
			token: getAddress(tokenAddress),
			amount: trimmed,
			memo: normalizedMemo,
		});
		onOpenChange(false);
	};

	const handleFund = async () => {
		if (!address) return;
		setFormError(null);
		const [, err] = await safeAsync(() => openTopUp());
		if (err) setFormError(err.message);
		else void refetch();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md gap-4">
				<DialogHeader>
					<DialogTitle>Signer invoice (USDC)</DialogTitle>
					<DialogDescription>
						Describe what this payment is for and how much USDC to escrow for
						this signer. Funds lock when you send the envelope.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					{wrongChain ? (
						<p className="text-xs text-destructive">
							Switch your wallet to {defaultChain.name} before funding or
							sending.
						</p>
					) : null}

					<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
						<div className="space-y-0.5">
							<p className="font-medium text-foreground/90">
								Your USDC balance
							</p>
							<p className="text-muted-foreground">
								{!address
									? "Connect a wallet to see balance."
									: wrongChain
										? `Switch to ${defaultChain.name} to load balance.`
										: balanceIsError
											? (balanceQueryError?.shortMessage ??
												balanceQueryError?.message ??
												"Could not load balance.")
											: balanceFetching && balance === undefined
												? "Loading…"
												: balance !== undefined
													? `${Number(
															formatUnits(balance, usdc.decimals),
														).toLocaleString(undefined, {
															maximumFractionDigits: 4,
														})} ${usdc.symbol}`
													: "—"}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8"
								disabled={!address || wrongChain}
								onClick={() => void refetch()}
							>
								Refresh
							</Button>
							<Button
								type="button"
								size="sm"
								className="h-8"
								disabled={!address || wrongChain}
								onClick={() => void handleFund()}
							>
								Add funds
							</Button>
						</div>
					</div>

					{usdc.faucets && usdc.faucets.length > 0 ? (
						<div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
							<span>Testnet faucet:</span>
							{usdc.faucets.map((faucet) => (
								<a
									key={faucet.url}
									href={faucet.url}
									target="_blank"
									rel="noreferrer"
									className="text-primary hover:underline"
								>
									{faucet.name}
								</a>
							))}
						</div>
					) : null}

					<div className="space-y-1.5">
						<Label htmlFor="invoice-amount" className={FIELD_LABEL_CLASS}>
							Amount (USD)
						</Label>
						<Input
							id="invoice-amount"
							type="text"
							inputMode="decimal"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							className={cn(
								FIELD_CONTROL_CLASS,
								"placeholder:text-muted-foreground/45",
							)}
							autoComplete="off"
						/>
						{amountExceedsBalance ? (
							<p className="text-xs text-destructive" role="status">
								This amount is higher than your loaded USDC balance.
							</p>
						) : balanceQueryEnabled && !balanceReady && !balanceIsError ? (
							<p className="text-xs text-muted-foreground" role="status">
								Wait for your balance to load before saving, or tap Refresh.
							</p>
						) : null}
						{signerNetLabel ? (
							<p className="text-xs text-muted-foreground" role="status">
								Signer receives ~{signerNetLabel} {usdc.symbol} after a{" "}
								{(platformFeeBps / 100).toLocaleString(undefined, {
									maximumFractionDigits: 2,
								})}
								% platform fee at settlement.
							</p>
						) : null}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="invoice-memo" className={FIELD_LABEL_CLASS}>
							Memo / description
						</Label>
						<Textarea
							id="invoice-memo"
							value={memo}
							onChange={(e) => setMemo(e.target.value)}
							placeholder="e.g. Contractor payment for Q1 design work"
							className={cn(FIELD_CONTROL_CLASS, "min-h-[88px] resize-y")}
							rows={3}
						/>
					</div>

					{formError ? (
						<p className="text-xs text-destructive" role="alert">
							{formError}
						</p>
					) : null}
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={() => {
							onClear();
						}}
					>
						Remove invoice
					</Button>
					<div className="flex flex-wrap gap-2 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={saveBlockedByBalance}
							title={
								saveBlockedByBalance
									? !balanceReady
										? "Balance must load before you can save."
										: "Amount cannot exceed your USDC balance."
									: undefined
							}
							onClick={handleSave}
						>
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
