import type {
	Web3FunctionFailContext,
	Web3FunctionSuccessContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Web3Function } from "@gelatonetwork/web3-functions-sdk";

export type FilosignWebhookUserArgs = {
	filosignWebhookUrl: string;
	filosignWebhookSecret: string;
};

export async function postFilosignWebhook(
	url: string,
	secret: string,
	body: Record<string, unknown>,
) {
	await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Gelato-Webhook-Secret": secret,
		},
		body: JSON.stringify(body),
	});
}

export async function pendingRuleFromStorage(context: {
	storage: Web3FunctionSuccessContext["storage"];
}) {
	const onChainRuleId = await context.storage.get("pendingOnChainRuleId");
	const cidId = await context.storage.get("pendingCidId");
	return { onChainRuleId, cidId };
}

export function registerPayoutWebhooks(
	getUserArgs: () => FilosignWebhookUserArgs,
) {
	Web3Function.onSuccess(async (context: Web3FunctionSuccessContext) => {
		const args = getUserArgs();
		if (!args.filosignWebhookUrl) return;

		const { onChainRuleId, cidId } = await pendingRuleFromStorage(context);
		await postFilosignWebhook(
			args.filosignWebhookUrl,
			args.filosignWebhookSecret,
			{
				kind: "success",
				transactionHash: context.transactionHash,
				...(onChainRuleId ? { onChainRuleId } : {}),
				...(cidId ? { cidId } : {}),
			},
		);

		if (onChainRuleId) {
			await context.storage.delete("pendingOnChainRuleId");
			await context.storage.delete("pendingCidId");
		}
	});

	Web3Function.onFail(async (context: Web3FunctionFailContext) => {
		const args = getUserArgs();
		if (!args.filosignWebhookUrl) return;

		const transactionHash =
			context.reason === "ExecutionReverted" ? context.transactionHash : null;

		const { onChainRuleId, cidId } = await pendingRuleFromStorage(context);
		await postFilosignWebhook(
			args.filosignWebhookUrl,
			args.filosignWebhookSecret,
			{
				kind: "fail",
				reason: context.reason,
				transactionHash,
				...(onChainRuleId ? { onChainRuleId } : {}),
				...(cidId ? { cidId } : {}),
			},
		);
	});
}
