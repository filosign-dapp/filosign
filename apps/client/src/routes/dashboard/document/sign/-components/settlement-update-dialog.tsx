import type { SettlementRuleRow } from "@filosign/react/files";
import type {
	SettlementReleaseType,
	SettlementRuleUpdateInput,
} from "@filosign/shared";
import { settlementReleaseTypeLabel } from "@filosign/shared";
import { useEffect, useState } from "react";
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

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rule: SettlementRuleRow | null;
	onConfirm: (args: {
		legs: { recipientWallet: `0x${string}`; amountUsdc: string }[];
		releaseType: SettlementReleaseType;
		releaseParams: SettlementRuleUpdateInput["releaseParams"];
	}) => Promise<void>;
	pending?: boolean;
};

export function SettlementUpdateDialog({
	open,
	onOpenChange,
	rule,
	onConfirm,
	pending,
}: Props) {
	const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
	const [amounts, setAmounts] = useState<string[]>([]);

	useEffect(() => {
		if (!open || !rule) return;
		setAmounts(
			(rule.legs?.length ? rule.legs : [{ amount: rule.amount }]).map((leg) => {
				const raw = Number(leg.amount) / 10 ** decimals;
				return String(raw);
			}),
		);
	}, [open, rule, decimals]);

	if (!rule) return null;

	const legs = rule.legs?.length
		? rule.legs
		: [
				{
					recipientWallet: rule.recipientWallet as `0x${string}`,
					recipientSource: rule.recipientSource,
					amount: rule.amount,
				},
			];

	const handleSave = async () => {
		const nextLegs = legs.map((leg, index) => {
			const trimmed = amounts[index]?.trim() ?? "";
			if (!trimmed || Number(trimmed) <= 0) {
				throw new Error("Enter a valid amount for each payout leg");
			}
			return {
				recipientWallet: leg.recipientWallet as `0x${string}`,
				amountUsdc: trimmed,
			};
		});
		await onConfirm({
			legs: nextLegs,
			releaseType: rule.releaseType,
			releaseParams:
				rule.releaseParams as SettlementRuleUpdateInput["releaseParams"],
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit settlement rule</DialogTitle>
					<DialogDescription>
						Update payout amounts on-chain. Release conditions stay{" "}
						{settlementReleaseTypeLabel(rule.releaseType).toLowerCase()}.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-3 py-1">
					{legs.map((leg, index) => (
						<div key={`${leg.recipientWallet}-${index}`} className="grid gap-2">
							<Label htmlFor={`settlement-leg-${index}`}>
								{leg.recipientWallet.slice(0, 6)}…
								{leg.recipientWallet.slice(-4)} (USDC)
							</Label>
							<Input
								id={`settlement-leg-${index}`}
								inputMode="decimal"
								value={amounts[index] ?? ""}
								onChange={(e) =>
									setAmounts((prev) => {
										const next = [...prev];
										next[index] = e.target.value;
										return next;
									})
								}
							/>
						</div>
					))}
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={pending}
						onClick={() => void handleSave().catch(console.error)}
					>
						{pending ? "Updating…" : "Update on-chain"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function legsToDraftAmounts(
	legs: { recipientWallet: `0x${string}`; amountUsdc: string }[],
) {
	const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
	return legs.map((leg) => ({
		recipientWallet: leg.recipientWallet,
		amount: parseUnits(leg.amountUsdc.trim(), decimals),
	}));
}
