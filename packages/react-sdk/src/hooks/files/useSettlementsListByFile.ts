import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

function hasAutoPayoutPending(
	rules: readonly {
		status: string;
		canExecuteOnChain?: boolean | null;
	}[],
): boolean {
	return rules.some(
		(rule) =>
			rule.canExecuteOnChain === true &&
			rule.status !== "executed" &&
			rule.status !== "cancelled" &&
			rule.status !== "partial" &&
			!rule.status.startsWith("failed_"),
	);
}

export function useSettlementsListByFile(pieceCid: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useQuery({
		...rpcQuery.settlements.listByFile.queryOptions({
			input: { pieceCid: pieceCid ?? "" },
		}),
		enabled: isAuthed && Boolean(pieceCid),
		refetchInterval: (query) =>
			hasAutoPayoutPending(query.state.data ?? []) ? 10_000 : false,
	});
}
