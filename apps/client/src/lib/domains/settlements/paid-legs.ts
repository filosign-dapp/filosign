import type { SettlementRuleRow } from "@filosign/react/files";

export function hasPaidSettlementLegs(
	rules: readonly SettlementRuleRow[],
): boolean {
	return rules.some(
		(rule) =>
			rule.status === "partial" ||
			rule.status === "executed" ||
			rule.legs?.some((leg) => leg.paid === true),
	);
}
