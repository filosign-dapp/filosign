import { useFilosignContext } from "@filosign/react";
import {
	readSettlementValidatorAllowance,
	type SettlementRuleRow,
} from "@filosign/react/files";
import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import {
	deriveSettlementAllowanceChangeStep,
	type SettlementAllowanceChangeStep,
	settlementAllowanceRequiredAfterUpdate,
} from "@/src/lib/domains/settlements/allowance";

export type { SettlementAllowanceChangeStep };

type Args = {
	open: boolean;
	allRules: SettlementRuleRow[];
	rule: SettlementRuleRow | null;
	draftAmounts: readonly string[];
};

export function useSettlementAllowancePreview({
	open,
	allRules,
	rule,
	draftAmounts,
}: Args) {
	const { wallet, contracts, runtime } = useFilosignContext();
	const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
	const payerAddress = wallet?.account?.address;
	const [currentAllowance, setCurrentAllowance] = useState<bigint | null>(null);
	const [loading, setLoading] = useState(false);

	const requiredAfter = useMemo(() => {
		if (!rule) return 0n;
		return settlementAllowanceRequiredAfterUpdate(
			allRules,
			rule,
			draftAmounts,
			decimals,
		);
	}, [allRules, decimals, draftAmounts, rule]);

	useEffect(() => {
		if (!open || !rule || !payerAddress || !contracts) {
			setCurrentAllowance(null);
			return;
		}

		let cancelled = false;
		setLoading(true);
		void readSettlementValidatorAllowance({
			contracts,
			chainKey: runtime.chainKey,
			tokenAddress: getAddress(rule.tokenAddress),
			payer: payerAddress,
			validatorAddress: getAddress(rule.validatorAddress),
		})
			.then((value) => {
				if (!cancelled) setCurrentAllowance(value);
			})
			.catch(() => {
				if (!cancelled) setCurrentAllowance(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [contracts, open, payerAddress, rule, runtime.chainKey]);

	const changeStep = deriveSettlementAllowanceChangeStep(
		currentAllowance,
		requiredAfter,
	);

	return {
		decimals,
		currentAllowance,
		requiredAfter,
		loading,
		changeStep,
	};
}
