import { useEffect, useState } from "react";

/** Records when each rule first became executable on-chain (for manual-settle grace). */
export function useFirstCanExecuteAtByRuleId(
	rules: readonly {
		onChainRuleId: string;
		canExecuteOnChain?: boolean | null;
	}[],
): Map<string, number> {
	const [firstCanExecuteAt, setFirstCanExecuteAt] = useState<
		Map<string, number>
	>(() => new Map());

	useEffect(() => {
		setFirstCanExecuteAt((prev) => {
			let next: Map<string, number> | null = null;
			for (const rule of rules) {
				if (rule.canExecuteOnChain !== true) {
					continue;
				}
				if (prev.has(rule.onChainRuleId)) {
					continue;
				}
				if (!next) {
					next = new Map(prev);
				}
				next.set(rule.onChainRuleId, Date.now());
			}
			return next ?? prev;
		});
	}, [rules]);

	return firstCanExecuteAt;
}
