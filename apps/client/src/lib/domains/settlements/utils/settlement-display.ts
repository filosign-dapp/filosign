import type { SettlementRuleRow } from "@filosign/react/files";
import { formatUnits } from "viem";

export function formatSettlementRecipientLine(
	rule: SettlementRuleRow,
	formatAddress: (address: string) => string,
): string {
	const legs = rule.legs?.length
		? rule.legs
		: [{ recipientWallet: rule.recipientWallet }];
	if (legs.length === 1) {
		return formatAddress(legs[0].recipientWallet);
	}
	return legs.map((leg) => formatAddress(leg.recipientWallet)).join(", ");
}

export function formatSettlementAmountLine(
	rule: SettlementRuleRow,
	decimals: number,
): string {
	const total = rule.totalAmount ?? rule.amount;
	if (!rule.legs?.length || rule.legs.length <= 1) {
		return `${formatUnits(BigInt(total), decimals)} USDC`;
	}
	const legParts = rule.legs.map(
		(leg) =>
			`${formatUnits(BigInt(leg.amount), decimals)} to ${leg.recipientWallet.slice(0, 6)}…${leg.recipientWallet.slice(-4)}`,
	);
	return `${formatUnits(BigInt(total), decimals)} USDC (${legParts.join("; ")})`;
}

export function isSettlementRecipient(
	rule: SettlementRuleRow,
	walletAddress: string,
): boolean {
	const wallet = walletAddress.toLowerCase();
	return (
		rule.legs?.some((leg) => leg.recipientWallet.toLowerCase() === wallet) ??
		rule.recipientWallet.toLowerCase() === wallet
	);
}
