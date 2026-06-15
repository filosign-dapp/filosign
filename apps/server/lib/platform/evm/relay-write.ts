import { ORPCError } from "@orpc/server";
import type { Hash, PublicClient, TransactionReceipt } from "viem";

type RelayReceipt = Pick<TransactionReceipt, "status">;

type WaitForReceipt = (hash: Hash) => Promise<RelayReceipt>;

export function createRelayReceiptWaiter(
	client: Pick<PublicClient, "waitForTransactionReceipt">,
): WaitForReceipt {
	return (hash) => client.waitForTransactionReceipt({ hash });
}

export async function relayWrite(args: {
	write: () => Promise<Hash>;
	waitForReceipt: WaitForReceipt;
	step: string;
	onBroadcast?: (hash: Hash) => Promise<void>;
}): Promise<Hash> {
	const hash = await args.write();
	if (args.onBroadcast) {
		await args.onBroadcast(hash);
	}
	const receipt = await args.waitForReceipt(hash);
	if (receipt.status !== "success") {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: `${args.step} reverted on-chain`,
		});
	}
	return hash;
}
