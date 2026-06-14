import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-entitlements";
import {
	invalidateActivationProgress,
	invalidateDocumentsList,
} from "../../lib/invalidate-queries";
import { sendFile } from "../../lib/send-file/send-file";
import type { SendFileArgs } from "../../lib/send-file/types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useUserProfile } from "../users";

export function useSendFile() {
	const {
		contracts,
		wallet,
		runtime: { chainKey },
	} = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const { data: user } = useUserProfile();

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: SendFileArgs) => {
			if (!contracts || !wallet || !user || !isAuthed) {
				throw new Error(
					"Not connected: contracts, wallet, profile, and auth required",
				);
			}

			const result = await sendFile(
				{
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
				args,
			);

			void invalidateDocumentsList(queryClient, rpcQuery);
			void invalidateActivationProgress(queryClient, rpcQuery);
			if (!args.isPractice) {
				void invalidateEntitlements(queryClient, rpcQuery);
			}

			return result;
		},
	});
}
