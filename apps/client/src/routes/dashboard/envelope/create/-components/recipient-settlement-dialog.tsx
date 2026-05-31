import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedSettlements,
	canUseBasicSettlements,
} from "@filosign/react/files";
import type { SettlementReleaseType } from "@filosign/shared";
import {
	isAdvancedSettlementReleaseType,
	normalizePlacementRecipientEmail,
	settlementReleaseTypeLabel,
} from "@filosign/shared";
import { useEffect, useMemo, useState } from "react";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { Button } from "@/src/lib/components/ui/button";
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
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";
import {
	buildDraftFromRecipient,
	recipientSettlementLabel,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

const BASIC_RELEASE_TYPES: SettlementReleaseType[] = [
	"all_signed",
	"specific_signer",
];

const ADVANCED_RELEASE_TYPES: SettlementReleaseType[] = [
	"all_required_signed",
	"all_signed_complete",
	"at_least_n",
	"quorum_required",
	"quorum_set",
	"quorum_all",
	"all_of_set",
];

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipient: Recipient;
	allRecipients: Recipient[];
	existingDraft: SettlementAttachmentDraft | undefined;
	onSave: (draft: SettlementAttachmentDraft) => void;
	onRemove: () => void;
};

export function RecipientSettlementDialog({
	open,
	onOpenChange,
	recipient,
	allRecipients,
	existingDraft,
	onSave,
	onRemove,
}: Props) {
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const canBasic = canUseBasicSettlements(entitlements);
	const canAdvanced = canUseAdvancedSettlements(entitlements);

	const [amountUsdc, setAmountUsdc] = useState("");
	const [releaseType, setReleaseType] = useState<SettlementReleaseType>(
		"all_required_signed",
	);
	const [specificSignerEmail, setSpecificSignerEmail] = useState("");
	const [thresholdN, setThresholdN] = useState("2");

	const releaseOptions = useMemo(() => {
		const basic = BASIC_RELEASE_TYPES.map((value) => ({
			value,
			label: settlementReleaseTypeLabel(value),
			advanced: false,
		}));
		const advanced = ADVANCED_RELEASE_TYPES.map((value) => ({
			value,
			label: settlementReleaseTypeLabel(value),
			advanced: true,
		}));
		return [...basic, ...advanced];
	}, []);

	const signerOptions = useMemo(() => {
		return allRecipients
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
	}, [allRecipients]);

	useEffect(() => {
		if (!open) return;
		setAmountUsdc(existingDraft?.amountUsdc ?? "");
		setReleaseType(existingDraft?.releaseType ?? "all_required_signed");
		setSpecificSignerEmail(
			existingDraft?.specificSignerEmail ?? signerOptions[0]?.email ?? "",
		);
		setThresholdN(String(existingDraft?.thresholdN ?? 2));
	}, [open, existingDraft, signerOptions]);

	const payeeLabel = recipientSettlementLabel(recipient);
	const emailValid = isValidRecipientEmail(recipient.email ?? "");

	const needsThreshold =
		releaseType === "at_least_n" ||
		releaseType === "quorum_required" ||
		releaseType === "quorum_set" ||
		releaseType === "quorum_all";

	const handleReleaseChange = (value: SettlementReleaseType) => {
		if (isAdvancedSettlementReleaseType(value) && !canAdvanced) {
			promptPlanUpgrade("features.settlement.advanced");
			return;
		}
		setReleaseType(value);
	};

	const handleSave = () => {
		if (!canBasic) {
			promptPlanUpgrade("features.settlement.basic");
			return;
		}
		const trimmed = amountUsdc.trim();
		if (!trimmed || Number(trimmed) <= 0) return;
		if (!emailValid) return;

		const draft = buildDraftFromRecipient(recipient, {
			id: existingDraft?.id,
			amountUsdc: trimmed,
			releaseType,
			specificSignerEmail:
				releaseType === "specific_signer" ? specificSignerEmail : undefined,
			thresholdN: needsThreshold ? Number(thresholdN) || 1 : undefined,
		});
		if (!draft) return;

		onSave(draft);
		onOpenChange(false);
	};

	const handleRemove = () => {
		onRemove();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Attach funds</DialogTitle>
					<DialogDescription>
						Optional USDC payout to <strong>{payeeLabel}</strong> when release
						conditions are met. Funds stay in your wallet until payout executes;
						Filosign never takes custody.
					</DialogDescription>
				</DialogHeader>

				{!emailValid ? (
					<p className="text-sm text-destructive">
						Enter a valid email for this recipient before attaching funds.
					</p>
				) : (
					<div className="grid gap-4 py-1">
						<div className="grid gap-2">
							<Label htmlFor="recipient-settlement-amount">Amount (USDC)</Label>
							<Input
								id="recipient-settlement-amount"
								inputMode="decimal"
								value={amountUsdc}
								onChange={(e) => setAmountUsdc(e.target.value)}
								placeholder="0.00"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="recipient-settlement-release">Release when</Label>
							<Select
								value={releaseType}
								onValueChange={(v) =>
									handleReleaseChange(v as SettlementReleaseType)
								}
							>
								<SelectTrigger id="recipient-settlement-release">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{releaseOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
											{option.advanced ? " (Teams Pro)" : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{releaseType === "specific_signer" ? (
							<div className="grid gap-2">
								<Label htmlFor="recipient-settlement-signer">Signer</Label>
								{signerOptions.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										Add at least one signer with a valid email.
									</p>
								) : (
									<Select
										value={specificSignerEmail}
										onValueChange={(v) => {
											if (v != null) setSpecificSignerEmail(v);
										}}
									>
										<SelectTrigger id="recipient-settlement-signer">
											<SelectValue placeholder="Select signer" />
										</SelectTrigger>
										<SelectContent>
											{signerOptions.map((s) => (
												<SelectItem key={s.email} value={s.email}>
													{s.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>
						) : null}

						{needsThreshold ? (
							<div className="grid gap-2">
								<Label htmlFor="recipient-settlement-threshold">
									Threshold N
								</Label>
								<Input
									id="recipient-settlement-threshold"
									type="number"
									min={1}
									value={thresholdN}
									onChange={(e) => setThresholdN(e.target.value)}
								/>
							</div>
						) : null}

						<p className="text-xs text-muted-foreground">
							Token: {SUPPORTED_TOKENS[0].symbol} on this network. You will
							approve this payout from your wallet when sending.
						</p>
					</div>
				)}

				<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
					{existingDraft ? (
						<Button
							type="button"
							variant="ghost"
							className="text-destructive sm:mr-auto"
							onClick={handleRemove}
						>
							Remove settlement
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
							variant="primary"
							disabled={
								!emailValid ||
								!amountUsdc.trim() ||
								Number(amountUsdc) <= 0 ||
								(releaseType === "specific_signer" &&
									(!specificSignerEmail || signerOptions.length === 0))
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
