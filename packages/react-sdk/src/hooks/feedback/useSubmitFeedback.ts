import type { InferClientInputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type SubmitFeedbackInput =
	InferClientInputs<AppRouterClient>["feedback"]["submit"];

export function useSubmitFeedback() {
	const { rpcQuery } = useFilosignRpc();

	return useMutation({
		mutationFn: (input: SubmitFeedbackInput) =>
			rpcQuery.feedback.submit.call(input),
	});
}
