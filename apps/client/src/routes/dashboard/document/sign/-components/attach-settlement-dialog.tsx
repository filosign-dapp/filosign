import type { SettlementRuleDraft } from "@filosign/react/files";
import {
	canUseAdvancedSettlements,
	useBasicPayoutAttachGate,
} from "@filosign/react/files";
import type { SettlementReleaseType } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useEffect, useMemo, useState } from "react";
import { parseUnits } from "viem";
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
import { handleBasicPayoutGateBlock } from "@/src/lib/domains/settlements/basic-payout-gate";
import { buildReleaseParamsFromSignerEmails } from "@/src/lib/domains/settlements/build-release-params";
import {
	expiresAtFromDatetimeLocal,
	SettlementExpiresAtField,
} from "@/src/lib/domains/settlements/settlement-expires-at-field";
import { SettlementReleaseFields } from "@/src/lib/domains/settlements/settlement-release-fields";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

type PayeeOption = {
	wallet: `0x${string}`;
	label: string;
	email?: string | null;
	recipientSource: SettlementAttachmentDraft["recipientSource"];
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	payees: PayeeOption[];
	signerEmails: string[];
	onConfirm: (rules: SettlementRuleDraft[]) => Promise<void>;
	pending?: boolean;
};

export function AttachSettlementDialog({
	open,
	onOpenChange,
	payees,
	signerEmails,
	onConfirm,
	pending,
}: Props) {
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const { entitlements, gate } = useBasicPayoutAttachGate();
	const canAdvanced = canUseAdvancedSettlements(entitlements);

	const [payeeWallet, setPayeeWallet] = useState("");
	const [amountUsdc, setAmountUsdc] = useState("");
	const [releaseType, setReleaseType] = useState<SettlementReleaseType>(
		"all_required_signed",
	);
	const [specificSignerEmail, setSpecificSignerEmail] = useState("");
	const [thresholdN, setThresholdN] = useState("2");
	const [expiresAtLocal, setExpiresAtLocal] = useState("");

	const signerOptions = useMemo(
		() =>
			signerEmails
				.filter((e) => isValidRecipientEmail(e))
				.map((email) => ({
					email: normalizePlacementRecipientEmail(email),
					label: email,
				})),
		[signerEmails],
	);

	useEffect(() => {
		if (!open) return;
		setSpecificSignerEmail(signerOptions[0]?.email ?? "");
	}, [open, signerOptions]);

	const options = useMemo(() => payees, [payees]);

	const handleAttach = async () => {
		if (handleBasicPayoutGateBlock(gate, promptPlanUpgrade)) return;
		const payee = options.find((p) => p.wallet === payeeWallet);
		const trimmed = amountUsdc.trim();
		if (!payee || !trimmed || Number(trimmed) <= 0) return;

		const token = SUPPORTED_TOKENS[0];
		const draft: SettlementAttachmentDraft = {
			id: crypto.randomUUID(),
			recipientClientRowId: payee.wallet,
			recipientEmail: payee.email ?? payee.label,
			recipientSource: payee.recipientSource,
			recipientLabel: payee.label,
			recipientWallet: payee.wallet,
			amountUsdc: trimmed,
			releaseType,
			specificSignerEmail:
				releaseType === "specific_signer" ? specificSignerEmail : undefined,
			thresholdN: Number(thresholdN) || undefined,
		};

		const rule: SettlementRuleDraft = {
			tokenAddress: token.address,
			releaseType,
			releaseParams: buildReleaseParamsFromSignerEmails(draft, signerEmails),
			expiresAt: expiresAtFromDatetimeLocal(expiresAtLocal),
			legs: [
				{
					recipientWallet: payee.wallet,
					recipientSource: payee.recipientSource,
					amount: parseUnits(trimmed, token.decimals),
				},
			],
		};

		await onConfirm([rule]);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-md max-h-[90vh] overflow-y-auto"
			>
				<DialogHeader>
					<DialogTitle>Add a payout</DialogTitle>
					<DialogDescription>
						Send USDC to someone on this document once the conditions you pick
						are met. Funds stay in your wallet until then—we never hold them.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-1">
					<div className="grid gap-2">
						<Label>Recipient</Label>
						<Select
							value={payeeWallet}
							onValueChange={(value) => setPayeeWallet(value ?? "")}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select recipient" />
							</SelectTrigger>
							<SelectContent>
								{options.map((p) => (
									<SelectItem key={p.wallet} value={p.wallet}>
										{p.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="attach-settlement-amount">Amount (USDC)</Label>
						<Input
							id="attach-settlement-amount"
							inputMode="decimal"
							value={amountUsdc}
							onChange={(e) => setAmountUsdc(e.target.value)}
						/>
					</div>
					<SettlementReleaseFields
						releaseSelectId="attach-settlement-release"
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
						id="attach-settlement-expires"
						value={expiresAtLocal}
						onChange={setExpiresAtLocal}
					/>
				</div>
				<DialogFooter>
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
						disabled={!payeeWallet || pending}
						onClick={() => void handleAttach().catch(console.error)}
					>
						{pending ? "Adding…" : "Add payout"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
