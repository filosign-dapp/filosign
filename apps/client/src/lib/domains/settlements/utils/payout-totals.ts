import { parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { SettlementAttachmentDraft } from "./attachment-draft";

const usdcDecimals = SUPPORTED_TOKENS[0].decimals;

function sumPositiveUsdcStrings(values: Iterable<string>): bigint {
	let total = 0n;
	for (const raw of values) {
		const trimmed = raw.trim();
		if (!trimmed) continue;
		try {
			const amount = parseUnits(trimmed, usdcDecimals);
			if (amount > 0n) total += amount;
		} catch {}
	}
	return total;
}

export function sumLegAmountStrings(
	amounts: Record<string, string>,
	clientRowIds: Iterable<string>,
): bigint {
	const values: string[] = [];
	for (const clientRowId of clientRowIds) {
		const amount = amounts[clientRowId];
		if (amount) values.push(amount);
	}
	return sumPositiveUsdcStrings(values);
}

export function sumSettlementDraftsUsdc(
	drafts: SettlementAttachmentDraft[],
): bigint {
	return sumPositiveUsdcStrings(drafts.map((draft) => draft.amountUsdc));
}

export function settlementPayoutExceedsBalance(args: {
	drafts: SettlementAttachmentDraft[];
	walletAddress: `0x${string}` | undefined;
	walletBalance: bigint;
	additionalWei?: bigint;
}): boolean {
	const total =
		sumSettlementDraftsUsdc(args.drafts) + (args.additionalWei ?? 0n);
	if (total === 0n || !args.walletAddress) return false;
	return total > args.walletBalance;
}
