import type { SettlementRuleRow } from "@filosign/react/files";
import type {
	SettlementReleaseType,
	SettlementRuleUpdateInput,
} from "@filosign/shared";
import { settlementReleaseTypeLabel } from "@filosign/shared";
import { useEffect, useState } from "react";
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
	resolveSettlementRuleLegs,
	type SettlementAllowanceChangeStep,
	settlementAllowanceChangeSummary,
	useSettlementAllowancePreview,
} from "@/src/lib/domains/settlements";
import { formatUsdcAmount } from "@/src/lib/web3/format-usdc";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	allRules: SettlementRuleRow[];
	rule: SettlementRuleRow | null;
	onConfirm: (args: {
		legs: { recipientWallet: `0x${string}`; amountUsdc: string }[];
		releaseType: SettlementReleaseType;
		releaseParams: SettlementRuleUpdateInput["releaseParams"];
		changeStep: SettlementAllowanceChangeStep;
	}) => Promise<void>;
	pending?: boolean;
};

export function SettlementUpdateDialog({
	open,
	onOpenChange,
	allRules,
	rule,
	onConfirm,
	pending,
}: Props) {
	const [amounts, setAmounts] = useState<string[]>([]);
	const {
		decimals,
		currentAllowance,
		requiredAfter,
		loading,
		changeStep,
		treasuryFunded,
	} = useSettlementAllowancePreview({
		open,
		allRules,
		rule,
		draftAmounts: amounts,
	});

	useEffect(() => {
		if (!open || !rule) return;
		setAmounts(
			resolveSettlementRuleLegs(rule).map((leg) => {
				const raw = Number(leg.amount) / 10 ** decimals;
				return String(raw);
			}),
		);
	}, [open, rule, decimals]);

	if (!rule) return null;

	const legs = resolveSettlementRuleLegs(rule);

	const handleSave = async () => {
		const nextLegs = legs.map((leg, index) => {
			const trimmed = amounts[index]?.trim() ?? "";
			if (!trimmed || Number(trimmed) <= 0) {
				throw new Error("Enter a valid amount for each recipient");
			}
			return {
				recipientWallet: leg.recipientWallet as `0x${string}`,
				amountUsdc: trimmed,
			};
		});
		try {
			await onConfirm({
				legs: nextLegs,
				releaseType: rule.releaseType,
				releaseParams:
					rule.releaseParams as SettlementRuleUpdateInput["releaseParams"],
				changeStep,
			});
			onOpenChange(false);
		} catch {
			// Error surfaced by onConfirm.
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Change payout amounts</DialogTitle>
					<DialogDescription>
						Update how much USDC goes to each recipient. Payout still happens
						when: {settlementReleaseTypeLabel(rule.releaseType).toLowerCase()}.
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
					<div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-1">
						<p>
							Current approval
							{treasuryFunded ? " (treasury)" : ""}:{" "}
							{loading
								? "Loading…"
								: currentAllowance === null
									? "Unavailable"
									: `${formatUsdcAmount(currentAllowance, decimals)} USDC`}
						</p>
						<p>
							Combined payout total after save:{" "}
							{formatUsdcAmount(requiredAfter, decimals)} USDC
						</p>
						<p>{settlementAllowanceChangeSummary(changeStep)}</p>
						{treasuryFunded ? (
							<p>
								Approval changes authorize from your workspace treasury account,
								not your personal signing account.
							</p>
						) : null}
						<p>
							To block all attached payouts, use Revoke payout approval instead.
						</p>
					</div>
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
						onClick={() => void handleSave().catch(() => {})}
					>
						{pending ? "Updating…" : "Save amounts"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
