import type { FilosignContracts } from "@filosign/contracts";
import type {
	Abi,
	Address,
	Hash,
	Hex,
	Log,
	PublicClient,
	TransactionReceipt,
} from "viem";
import { createPublicClient, http, parseEventLogs } from "viem";

export function filosignPublicClient(
	contracts: FilosignContracts,
): PublicClient {
	const chain = contracts.$client.chain;
	if (!chain) {
		throw new Error(
			"Chain config missing from Filosign contracts client; cannot wait for transaction receipts",
		);
	}
	return createPublicClient({
		chain,
		transport: http(),
	});
}

export async function waitForTxReceipt(
	contracts: FilosignContracts,
	hash: Hash,
) {
	const receipt = await filosignPublicClient(
		contracts,
	).waitForTransactionReceipt({ hash });
	if (receipt.status !== "success") {
		throw new Error(`Transaction ${hash} reverted on-chain`);
	}
	return receipt;
}

export function parseRuleIdFromReceipt(args: {
	receipt: Pick<TransactionReceipt, "logs">;
	emitter: Address;
	abi: Abi;
	eventName: "PaymentRuleRegistered" | "AttachmentRuleRegistered";
}): string {
	const parsed = parseEventLogs({
		abi: args.abi,
		logs: [...args.receipt.logs] as Log[],
		eventName: args.eventName,
	});
	const emitter = args.emitter.toLowerCase();
	const match = parsed.find(
		(log) =>
			log.eventName === args.eventName && log.address.toLowerCase() === emitter,
	);
	if (!match) {
		throw new Error(
			`${args.eventName} event not found in receipt from ${args.emitter}`,
		);
	}
	const ruleId = (match.args as { ruleId: bigint }).ruleId;
	return ruleId.toString(10);
}
