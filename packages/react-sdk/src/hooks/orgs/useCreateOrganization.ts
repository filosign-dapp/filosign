import {
	encryption,
	KEM,
	randomBytes,
	toBytes,
	toHex,
} from "@filosign/crypto-utils";
import { ORG_OMK_WRAP_INFO } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useUserProfile } from "../users/useUserProfile";

export function useCreateOrganization() {
	const { wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const { data: user } = useUserProfile();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { name: string; pendingBillingId?: string }) => {
			if (!wallet?.account || !user || !isAuthed) {
				throw new Error("Wallet and profile required");
			}
			const omkSeed = randomBytes(64);
			const { publicKey: omkPublic } = await KEM.keyGen({ seed: omkSeed });
			const omkPublicHex = toHex(omkPublic);

			const { ciphertext, sharedSecret } = await KEM.encapsulate({
				publicKeyOther: toBytes(user.encryptionPublicKey),
			});
			const wrappedOmkForCreator = await encryption.encrypt({
				message: omkSeed,
				secretKey: sharedSecret,
				info: ORG_OMK_WRAP_INFO,
			});

			const result = await rpcQuery.orgs.create.call({
				name: args.name,
				encryptionPublicKey: omkPublicHex,
				wrappedOmkForCreator: toHex(wrappedOmkForCreator),
				creatorWrapKemCiphertext: toHex(ciphertext),
				...(args.pendingBillingId
					? { pendingBillingId: args.pendingBillingId }
					: {}),
			});

			return result;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.listMine.key(),
			});
		},
	});
}
