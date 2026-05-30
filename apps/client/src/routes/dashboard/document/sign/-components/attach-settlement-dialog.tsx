import type { SettlementRuleDraft } from "@filosign/react/files";
import type { SettlementReleaseType } from "@filosign/shared";
import { settlementReleaseTypeLabel } from "@filosign/shared";
import { useMemo, useState } from "react";
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
import { buildReleaseParamsFromDraft } from "@/src/lib/domains/settlements/build-release-params";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";

type PayeeOption = {
	wallet: `0x${string}`;
	label: string;
	recipientSource: SettlementAttachmentDraft["recipientSource"];
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	payees: PayeeOption[];
	onConfirm: (rules: SettlementRuleDraft[]) => Promise<void>;
	pending?: boolean;
};

export function AttachSettlementDialog({
	open,
	onOpenChange,
	payees,
	onConfirm,
	pending,
}: Props) {
	const [payeeWallet, setPayeeWallet] = useState("");
	const [amountUsdc, setAmountUsdc] = useState("");
	const [releaseType, setReleaseType] =
		useState<SettlementReleaseType>("all_signed");

	const options = useMemo(() => payees, [payees]);

	const handleAttach = async () => {
		const payee = options.find((p) => p.wallet === payeeWallet);
		const trimmed = amountUsdc.trim();
		if (!payee || !trimmed || Number(trimmed) <= 0) return;

		const token = SUPPORTED_TOKENS[0];
		const draft: SettlementAttachmentDraft = {
			id: crypto.randomUUID(),
			recipientClientRowId: payee.wallet,
			recipientEmail: payee.label,
			recipientSource: payee.recipientSource,
			recipientLabel: payee.label,
			recipientWallet: payee.wallet,
			amountUsdc: trimmed,
			releaseType,
		};

		const rule: SettlementRuleDraft = {
			tokenAddress: token.address,
			releaseType,
			releaseParams: buildReleaseParamsFromDraft(draft, []),
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
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Attach payout</DialogTitle>
					<DialogDescription>
						Register a new on-chain settlement rule for this document after
						send.
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
					<div className="grid gap-2">
						<Label>Release when</Label>
						<Select
							value={releaseType}
							onValueChange={(v) => setReleaseType(v as SettlementReleaseType)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all_signed">
									{settlementReleaseTypeLabel("all_signed")}
								</SelectItem>
								<SelectItem value="all_required_signed">
									{settlementReleaseTypeLabel("all_required_signed")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
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
						{pending ? "Attaching…" : "Attach on-chain"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
