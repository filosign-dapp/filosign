import {
	canUseAdvancedSettlements,
	useBasicPayoutAttachGate,
} from "@filosign/react/files";
import type { SettlementReleaseType } from "@filosign/shared";
import {
	normalizePlacementRecipientEmail,
	normalizeSettlementReleaseType,
	releaseTypeHidesThresholdInput,
	resolveReleaseParamsForRouting,
	validateReleaseParamsForRouting,
} from "@filosign/shared";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Image } from "@/src/lib/components/app/media/image";
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
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import type { RoutingContext } from "@/src/lib/domains/satellites/routing-context";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import {
	handleBasicPayoutGateBlock,
	PAYOUT_EXCEEDS_BALANCE_MESSAGE,
	SettlementReleaseFields,
	settlementPayoutExceedsBalance,
	sumLegAmountStrings,
} from "@/src/lib/domains/settlements";
import { createClientId } from "@/src/lib/utils/id";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import { useRecipientPayoutEligibility } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-recipient-payout-eligibility";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	buildLegDraftFromExternalWallet,
	buildLegDraftFromRecipient,
	recipientSettlementLabel,
	ruleIdForDraft,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

const DEFAULT_RELEASE_TYPE: SettlementReleaseType = "all_signed";
const usdcToken = SUPPORTED_TOKENS[0];

const EMPTY_SETTLEMENT_DRAFTS: SettlementAttachmentDraft[] = [];
const EMPTY_SETTLEMENT_LEGS: SettlementAttachmentDraft[] = [];

type LegAmounts = Record<string, string>;

type ExternalLegDraft = {
	id: string;
	address: string;
	amount: string;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipients: Recipient[];
	routingContext: RoutingContext;
	allSettlementDrafts?: SettlementAttachmentDraft[];
	existingRuleId?: string | null;
	existingLegs?: SettlementAttachmentDraft[];
	payerWalletAddress?: `0x${string}`;
	payerLabel: "treasury" | "wallet";
	walletBalance: bigint;
	walletBalanceFormatted: string;
	balancePending: boolean;
	balanceError: boolean;
	onSave?: (ruleId: string, legs: SettlementAttachmentDraft[]) => void;
	onRemove?: () => void;
	onAttachLegs?: (legs: SettlementAttachmentDraft[]) => Promise<void>;
	attachPending?: boolean;
};

function defaultThresholdString(routing: RoutingContext): string {
	if (routing.quorumN > 0) return String(routing.quorumN);
	return "1";
}

function PayoutRecipientLegRow({
	recipient,
	checked,
	amountUsdc,
	onCheckedChange,
	onAmountChange,
}: {
	recipient: Recipient;
	checked: boolean;
	amountUsdc: string;
	onCheckedChange: (checked: boolean) => void;
	onAmountChange: (amount: string) => void;
}) {
	const { lookupSettled, canAttachPayout } =
		useRecipientPayoutEligibility(recipient);
	const clientRowId = recipient.clientRowId;
	const label = recipientSettlementLabel(recipient);

	if (!clientRowId || !lookupSettled || !canAttachPayout) return null;

	return (
		<div className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
			<Checkbox
				id={`payout-recipient-${clientRowId}`}
				checked={checked}
				onCheckedChange={(next) => onCheckedChange(next === true)}
				className="mt-0.5"
			/>
			<div className="min-w-0 flex-1 space-y-2">
				<label
					htmlFor={`payout-recipient-${clientRowId}`}
					className="block cursor-pointer text-sm font-medium"
				>
					{label}
				</label>
				{checked ? (
					<div className="relative max-w-48">
						<Input
							variant="field"
							inputMode="decimal"
							value={amountUsdc}
							onChange={(e) => onAmountChange(e.target.value)}
							placeholder="0.00"
							className="pr-19"
							aria-label={`Amount for ${label}`}
						/>
						<span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-muted-foreground">
							<Image
								src={usdcToken.icon}
								alt=""
								width={14}
								height={14}
								className="size-3.5 rounded-full"
							/>
							USDC
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

function sumPositiveUsdcFromExternalLegs(legs: ExternalLegDraft[]): bigint {
	let total = 0n;
	for (const leg of legs) {
		const trimmed = leg.amount.trim();
		if (!trimmed || Number(trimmed) <= 0) continue;
		try {
			const amount = parseUnits(trimmed, usdcToken.decimals);
			if (amount > 0n) total += amount;
		} catch {}
	}
	return total;
}

function externalLegIsValid(
	leg: ExternalLegDraft,
	payerWallet?: `0x${string}`,
): boolean {
	const trimmed = leg.amount.trim();
	if (!trimmed || Number(trimmed) <= 0) return false;
	if (!isAddress(leg.address)) return false;
	if (!payerWallet) return true;
	return getAddress(leg.address) !== getAddress(payerWallet);
}

function initialExternalLegs(
	existingLegs: SettlementAttachmentDraft[],
): ExternalLegDraft[] {
	return existingLegs
		.filter((leg) => leg.recipientSource === "external")
		.map((leg) => ({
			id: leg.id,
			address: leg.recipientWallet ?? "",
			amount: leg.amountUsdc,
		}));
}

function initialLegAmounts(
	existingLegs: SettlementAttachmentDraft[],
): LegAmounts {
	const amounts: LegAmounts = {};
	for (const leg of existingLegs) {
		if (leg.recipientSource === "external") continue;
		if (leg.recipientClientRowId) {
			amounts[leg.recipientClientRowId] = leg.amountUsdc;
		}
	}
	return amounts;
}

function initialSelectedIds(
	existingLegs: SettlementAttachmentDraft[],
): Set<string> {
	return new Set(
		existingLegs
			.filter((leg) => leg.recipientSource !== "external")
			.map((leg) => leg.recipientClientRowId)
			.filter((id): id is string => Boolean(id)),
	);
}

function releaseThresholdForDraft(
	normalizedReleaseType: SettlementReleaseType,
	resolvedThresholdN: number | undefined,
	thresholdN: string,
): number | undefined {
	if (
		normalizedReleaseType === "at_least_n" ||
		normalizedReleaseType === "quorum_required" ||
		normalizedReleaseType === "quorum_set" ||
		normalizedReleaseType === "quorum_all"
	) {
		return resolvedThresholdN ?? (Number(thresholdN) || 1);
	}
	return undefined;
}

function buildPayoutRuleLegs(args: {
	ruleId: string;
	normalizedReleaseType: SettlementReleaseType;
	specificSignerEmail: string;
	thresholdN: string;
	resolvedThresholdN: number | undefined;
	expiresAtUnix?: number;
	selectedRecipients: Recipient[];
	legAmounts: LegAmounts;
	existingLegs: SettlementAttachmentDraft[];
	configuredExternalLegs: ExternalLegDraft[];
}): SettlementAttachmentDraft[] {
	const legs: SettlementAttachmentDraft[] = [];
	const threshold = releaseThresholdForDraft(
		args.normalizedReleaseType,
		args.resolvedThresholdN,
		args.thresholdN,
	);

	for (const recipient of args.selectedRecipients) {
		const clientRowId = recipient.clientRowId;
		if (!clientRowId) continue;
		const amount = args.legAmounts[clientRowId]?.trim();
		if (!amount) continue;

		const existingLeg = args.existingLegs.find(
			(leg) => leg.recipientClientRowId === clientRowId,
		);

		const draft = buildLegDraftFromRecipient(recipient, {
			ruleId: args.ruleId,
			id: existingLeg?.id,
			amountUsdc: amount,
			releaseType: args.normalizedReleaseType,
			specificSignerEmail:
				args.normalizedReleaseType === "specific_signer"
					? args.specificSignerEmail
					: undefined,
			thresholdN: threshold,
			expiresAtUnix: args.expiresAtUnix,
		});
		if (draft) legs.push(draft);
	}

	for (const externalLeg of args.configuredExternalLegs) {
		const amount = externalLeg.amount.trim();
		if (!amount) continue;

		const draft = buildLegDraftFromExternalWallet({
			ruleId: args.ruleId,
			id: externalLeg.id,
			address: externalLeg.address.trim(),
			amountUsdc: amount,
			releaseType: args.normalizedReleaseType,
			specificSignerEmail:
				args.normalizedReleaseType === "specific_signer"
					? args.specificSignerEmail
					: undefined,
			thresholdN: threshold,
			expiresAtUnix: args.expiresAtUnix,
		});
		if (draft) legs.push(draft);
	}

	return legs;
}

export function PayoutRuleDialog({
	open,
	onOpenChange,
	recipients,
	routingContext,
	allSettlementDrafts = EMPTY_SETTLEMENT_DRAFTS,
	existingRuleId = null,
	existingLegs = EMPTY_SETTLEMENT_LEGS,
	payerWalletAddress,
	payerLabel,
	walletBalance,
	walletBalanceFormatted,
	balancePending,
	balanceError,
	onSave,
	onRemove,
	onAttachLegs,
	attachPending = false,
}: Props) {
	const isAttachMode = Boolean(onAttachLegs);
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const { entitlements, gate, canUseExternalRecipients } =
		useBasicPayoutAttachGate();
	const canAdvanced = canUseAdvancedSettlements(entitlements);

	const [releaseType, setReleaseType] =
		useState<SettlementReleaseType>(DEFAULT_RELEASE_TYPE);
	const [specificSignerEmail, setSpecificSignerEmail] = useState("");
	const [thresholdN, setThresholdN] = useState(() =>
		defaultThresholdString(routingContext),
	);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [legAmounts, setLegAmounts] = useState<LegAmounts>({});
	const [externalLegs, setExternalLegs] = useState<ExternalLegDraft[]>([]);

	const walletAddress = payerWalletAddress;

	const signerOptions = useMemo(() => {
		return recipients
			.filter((r) => r.role === "signer")
			.map((r) => {
				const raw = r.email?.trim();
				if (!raw || !isValidRecipientEmail(raw)) return null;
				return {
					email: normalizePlacementRecipientEmail(raw),
					label: recipientSettlementLabel(r),
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
	}, [recipients]);

	const firstLeg = existingLegs[0];

	useEffect(() => {
		if (!open) return;
		setReleaseType(
			normalizeSettlementReleaseType(
				firstLeg?.releaseType ?? DEFAULT_RELEASE_TYPE,
			),
		);
		setSpecificSignerEmail(
			firstLeg?.specificSignerEmail ?? signerOptions[0]?.email ?? "",
		);
		setThresholdN(
			String(
				firstLeg?.thresholdN ??
					(routingContext.quorumN > 0 &&
					normalizeSettlementReleaseType(
						firstLeg?.releaseType ?? DEFAULT_RELEASE_TYPE,
					) === "quorum_required"
						? routingContext.quorumN
						: defaultThresholdString(routingContext)),
			),
		);
		setSelectedIds(initialSelectedIds(existingLegs));
		setLegAmounts(initialLegAmounts(existingLegs));
		setExternalLegs(initialExternalLegs(existingLegs));
	}, [open, existingLegs, firstLeg, signerOptions, routingContext]);

	useEffect(() => {
		if (
			releaseType === "quorum_required" &&
			releaseTypeHidesThresholdInput(releaseType, routingContext)
		) {
			setThresholdN(String(routingContext.quorumN));
		}
	}, [releaseType, routingContext]);

	const selectedRecipients = useMemo(
		() =>
			recipients.filter((r) => r.clientRowId && selectedIds.has(r.clientRowId)),
		[recipients, selectedIds],
	);

	const otherDrafts = useMemo(() => {
		if (!existingRuleId) return allSettlementDrafts;
		return allSettlementDrafts.filter(
			(d) => ruleIdForDraft(d) !== existingRuleId,
		);
	}, [allSettlementDrafts, existingRuleId]);

	const externalRuleWei = useMemo(
		() => sumPositiveUsdcFromExternalLegs(externalLegs),
		[externalLegs],
	);

	const currentRuleWei = useMemo(
		() => sumLegAmountStrings(legAmounts, selectedIds) + externalRuleWei,
		[legAmounts, selectedIds, externalRuleWei],
	);

	const exceedsBalance =
		currentRuleWei > 0n &&
		!balancePending &&
		!balanceError &&
		settlementPayoutExceedsBalance({
			drafts: otherDrafts,
			walletAddress,
			walletBalance,
			additionalWei: currentRuleWei,
		});

	const legsValid = selectedRecipients.every((recipient) => {
		const id = recipient.clientRowId;
		if (!id) return false;
		const trimmed = legAmounts[id]?.trim();
		return Boolean(trimmed) && Number(trimmed) > 0;
	});

	const configuredExternalLegs = useMemo(
		() =>
			canUseExternalRecipients
				? externalLegs.filter(
						(leg) =>
							leg.address.trim().length > 0 || leg.amount.trim().length > 0,
					)
				: [],
		[externalLegs, canUseExternalRecipients],
	);

	const externalLegsValid =
		configuredExternalLegs.length === 0 ||
		configuredExternalLegs.every((leg) =>
			externalLegIsValid(leg, walletAddress),
		);

	const hasRecipients =
		selectedRecipients.length > 0 || configuredExternalLegs.length > 0;

	const canSave =
		hasRecipients &&
		(selectedRecipients.length === 0 || legsValid) &&
		externalLegsValid &&
		!exceedsBalance &&
		!(
			releaseType === "specific_signer" &&
			(!specificSignerEmail || signerOptions.length === 0)
		);

	const handleSave = async () => {
		if (handleBasicPayoutGateBlock(gate, promptPlanUpgrade)) return;
		if (!canSave) return;

		const validation = validateReleaseParamsForRouting({
			releaseType,
			thresholdN,
			routing: routingContext,
		});
		if (!validation.ok) return;

		const resolvedParams = resolveReleaseParamsForRouting({
			releaseType,
			thresholdN,
			routing: routingContext,
		});
		const resolvedThresholdN =
			"thresholdN" in resolvedParams &&
			typeof resolvedParams.thresholdN === "number"
				? resolvedParams.thresholdN
				: undefined;

		const ruleId = existingRuleId ?? createClientId();
		const normalizedReleaseType = normalizeSettlementReleaseType(releaseType);
		const legs = buildPayoutRuleLegs({
			ruleId,
			normalizedReleaseType,
			specificSignerEmail,
			thresholdN,
			resolvedThresholdN,
			expiresAtUnix: firstLeg?.expiresAtUnix,
			selectedRecipients,
			legAmounts,
			existingLegs,
			configuredExternalLegs,
		});

		if (legs.length === 0) return;

		if (onAttachLegs) {
			await onAttachLegs(legs);
			onOpenChange(false);
			return;
		}

		onSave?.(ruleId, legs);
		onOpenChange(false);
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

	const toggleRecipient = (clientRowId: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(clientRowId);
			else next.delete(clientRowId);
			return next;
		});
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
						{isAttachMode
							? "Add payout"
							: existingRuleId
								? "Edit payout"
								: "Add payout"}
					</DialogTitle>
					<DialogDescription>
						Set when USDC is released, then choose Filosign recipients or
						external wallet addresses and amounts. Funds stay in your account
						until conditions are met.{" "}
						<DocsLink href={DOCS_LINKS.payouts()}>Payouts guide</DocsLink>
					</DialogDescription>
				</DialogHeader>

				<div className="grid max-h-[60vh] gap-4 overflow-y-auto py-1">
					{walletAddress ? (
						<div className="space-y-1.5">
							<Label className="text-xs font-normal text-muted-foreground">
								{payerLabel === "treasury"
									? "Treasury wallet"
									: "Paying account"}
							</Label>
							<div className="flex items-center gap-2 overflow-hidden rounded-md border border-border/40 bg-muted/10 px-3 h-9 font-mono text-xs text-foreground/80">
								<span className="min-w-0 flex-1 truncate">{walletAddress}</span>
								<CopyButton
									text={walletAddress}
									className="shrink-0 text-muted-foreground hover:text-foreground"
								/>
							</div>
						</div>
					) : null}

					<SettlementReleaseFields
						releaseSelectId="payout-rule-release"
						releaseType={releaseType}
						onReleaseTypeChange={setReleaseType}
						canAdvanced={canAdvanced}
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

					<div className="grid gap-2">
						<div className="flex items-baseline justify-between gap-3">
							<Label>Recipients</Label>
							{balancePending ? (
								<span className="text-xs text-muted-foreground">
									Loading balance…
								</span>
							) : !walletAddress ? (
								<span className="text-xs text-muted-foreground">
									Sign in to see balance
								</span>
							) : balanceError ? (
								<span className="text-xs text-muted-foreground">
									Balance unavailable
								</span>
							) : (
								<span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
									<Image
										src={usdcToken.icon}
										alt=""
										width={12}
										height={12}
										className="size-3 rounded-full"
									/>
									{walletBalanceFormatted} available
									{payerLabel === "treasury" ? " (treasury)" : null}
								</span>
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							Filosign recipients need a linked wallet.
							{canUseExternalRecipients
								? " External wallets can be any valid Base address."
								: null}
						</p>
						<div className="space-y-2">
							{recipients.map((recipient, index) => {
								const clientRowId = recipient.clientRowId;
								if (!clientRowId) return null;
								return (
									<PayoutRecipientLegRow
										key={clientRowId ?? `recipient-${index}`}
										recipient={recipient}
										checked={selectedIds.has(clientRowId)}
										amountUsdc={legAmounts[clientRowId] ?? ""}
										onCheckedChange={(checked) =>
											toggleRecipient(clientRowId, checked)
										}
										onAmountChange={(amount) =>
											setLegAmounts((prev) => ({
												...prev,
												[clientRowId]: amount,
											}))
										}
									/>
								);
							})}
						</div>
						{exceedsBalance ? (
							<p className="text-xs text-destructive">
								{PAYOUT_EXCEEDS_BALANCE_MESSAGE}
							</p>
						) : null}
					</div>

					{canUseExternalRecipients ? (
						<div className="grid gap-2">
							<div className="flex items-center justify-between gap-3">
								<Label>External wallet</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										setExternalLegs((prev) => [
											...prev,
											{ id: createClientId(), address: "", amount: "" },
										])
									}
								>
									Add wallet
								</Button>
							</div>
							{externalLegs.length > 0 ? (
								<div className="space-y-2">
									{externalLegs.map((leg) => (
										<div
											key={leg.id}
											className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/50 p-3 sm:flex-row sm:items-start"
										>
											<div className="min-w-0 flex-1 space-y-2">
												<Input
													variant="field"
													value={leg.address}
													onChange={(e) =>
														setExternalLegs((prev) =>
															prev.map((row) =>
																row.id === leg.id
																	? { ...row, address: e.target.value }
																	: row,
															),
														)
													}
													placeholder="0x…"
													aria-label="External wallet address"
												/>
												{leg.address.trim() &&
												!isAddress(leg.address.trim()) ? (
													<p className="text-xs text-destructive">
														Enter a valid wallet address.
													</p>
												) : null}
												{walletAddress &&
												isAddress(leg.address.trim()) &&
												getAddress(leg.address.trim()) ===
													getAddress(walletAddress) ? (
													<p className="text-xs text-destructive">
														The payer can't also be a recipient on the same
														payout.
													</p>
												) : null}
											</div>
											<div className="flex items-start gap-2">
												<div className="relative w-full max-w-48 sm:w-40">
													<Input
														variant="field"
														inputMode="decimal"
														value={leg.amount}
														onChange={(e) =>
															setExternalLegs((prev) =>
																prev.map((row) =>
																	row.id === leg.id
																		? { ...row, amount: e.target.value }
																		: row,
																),
															)
														}
														placeholder="0.00"
														aria-label="Amount for external wallet"
														className="pr-19"
													/>
													<span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-muted-foreground">
														<Image
															src={usdcToken.icon}
															alt=""
															width={14}
															height={14}
															className="size-3.5 rounded-full"
														/>
														USDC
													</span>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="text-destructive"
													onClick={() =>
														setExternalLegs((prev) =>
															prev.filter((row) => row.id !== leg.id),
														)
													}
												>
													Remove
												</Button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									Add a wallet address to pay someone who is not on this
									envelope.
								</p>
							)}
						</div>
					) : null}

					<p className="text-xs text-muted-foreground">
						{payerLabel === "treasury"
							? "You approve this payout from the workspace treasury when you send. Treasury authorization uses a separate account from your personal signing account."
							: "You approve this payout from your account when you send the envelope."}
					</p>
					<p className="text-xs text-muted-foreground">
						Requires ETH on Base for USDC approval and payout registration when
						you send.
					</p>
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					{existingRuleId && onRemove && !isAttachMode ? (
						<Button
							type="button"
							variant="ghost"
							className="text-destructive sm:mr-auto"
							onClick={handleRemove}
						>
							Remove payout
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
							disabled={!canSave || attachPending}
							onClick={() => void handleSave().catch(console.error)}
						>
							{attachPending ? "Adding…" : isAttachMode ? "Add payout" : "Save"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
