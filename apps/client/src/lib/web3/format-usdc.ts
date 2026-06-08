import { formatUnits, parseUnits } from "viem";

export function formatUsdcAmountString(
	amount: string,
	decimals: number,
): string {
	const trimmed = amount.trim();
	if (!trimmed) return amount;
	try {
		return formatUsdcAmount(parseUnits(trimmed, decimals), decimals);
	} catch {
		return amount;
	}
}

export function formatUsdcAmount(value: bigint, decimals: number): string {
	const n = Number(formatUnits(value, decimals));
	const safe = Number.isFinite(n) ? n : 0;
	return new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(safe);
}

export function formatUsdcAmountParts(
	value: bigint,
	decimals: number,
): { whole: string; fraction: string } {
	const n = Number(formatUnits(value, decimals));
	const safe = Number.isFinite(n) ? n : 0;
	const parts = new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).formatToParts(safe);

	let whole = "";
	let fraction = "";
	for (const p of parts) {
		if (p.type === "integer" || p.type === "group") whole += p.value;
		else if (p.type === "fraction") fraction = p.value;
	}
	return { whole: whole || "0", fraction: fraction || "00" };
}
