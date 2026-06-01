import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedSettlements,
	canUseBasicSettlements,
} from "@filosign/react/files";
import type { SettlementReleaseType } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
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
	expiresAtFromDatetimeLocal,
	SettlementExpiresAtField,
} from "@/src/lib/domains/settlements/settlement-expires-at-field";
import { SettlementReleaseFields } from "@/src/lib/domains/settlements/settlement-release-fields";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";
import {
	buildDraftFromRecipient,
	recipientSettlementLabel,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

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
	const [expiresAtLocal, setExpiresAtLocal] = useState("");

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
		setExpiresAtLocal("");
	}, [open, existingDraft, signerOptions]);

	const payeeLabel = recipientSettlementLabel(recipient);
	const emailValid = isValidRecipientEmail(recipient.email ?? "");

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
			thresholdN:
				releaseType === "at_least_n" ||
				releaseType === "quorum_required" ||
				releaseType === "quorum_set" ||
				releaseType === "quorum_all"
					? Number(thresholdN) || 1
					: undefined,
			expiresAtUnix: expiresAtFromDatetimeLocal(expiresAtLocal)
				? Number(expiresAtFromDatetimeLocal(expiresAtLocal))
				: undefined,
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
					<DialogTitle>Add a payout</DialogTitle>
					<DialogDescription>
						Optional USDC payout for <strong>{payeeLabel}</strong> when the
						conditions you pick are met—separate from envelope signing options.
						Money stays in your wallet until then; we never hold it.
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

						<SettlementReleaseFields
							releaseSelectId="recipient-settlement-release"
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
						/>
						<SettlementExpiresAtField
							id="recipient-settlement-expires"
							value={expiresAtLocal}
							onChange={setExpiresAtLocal}
						/>

						<p className="text-xs text-muted-foreground">
							{SUPPORTED_TOKENS[0].symbol} on this network. You&apos;ll approve
							the payout from your wallet when you send the envelope.
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
