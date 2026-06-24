import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-entitlements";
import {
	invalidateActivationProgress,
	invalidateDocumentsList,
} from "../../lib/invalidate-queries";
import type { SendFileProgressReporter } from "../../lib/send-file/progress";
import { retryPostSendSatellites } from "../../lib/send-file/retry-post-send";
import type {
	PostSendRetryPayload,
	SendFileIncompleteStep,
} from "../../lib/send-file/types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useUserProfile } from "../users";

export type RetryPostSendSatellitesArgs = {
	pieceCid: string;
	incompleteSteps: SendFileIncompleteStep[];
	payload: PostSendRetryPayload;
	onProgress?: SendFileProgressReporter;
};

export function useRetryPostSendSatellites() {
	const {
		contracts,
		wallet,
		runtime: { chainKey },
	} = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const { data: user } = useUserProfile();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: RetryPostSendSatellitesArgs) => {
			if (!contracts || !wallet || !user || !isAuthed) {
				throw new Error(
					"Not connected: contracts, wallet, profile, and auth required",
				);
			}

			const result = await retryPostSendSatellites({
				deps: {
					contracts,
					wallet,
					user: {
						email: user.email,
						authSubjectCommitment: user.authSubjectCommitment,
						encryptionPublicKey: user.encryptionPublicKey,
					},
					rpc,
					rpcQuery,
					chainKey,
				},
				pieceCid: args.pieceCid,
				incompleteSteps: args.incompleteSteps,
				payload: args.payload,
				onProgress: args.onProgress,
			});

			void invalidateDocumentsList(queryClient, rpcQuery);
			void invalidateActivationProgress(queryClient, rpcQuery);
			void invalidateEntitlements(queryClient, rpcQuery);

			return result;
		},
	});
}
