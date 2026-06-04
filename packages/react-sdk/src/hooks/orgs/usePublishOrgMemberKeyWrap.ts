import { encryption, KEM, toBytes, toHex } from "@filosign/crypto-utils";
import { ORG_OMK_WRAP_INFO } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { getSessionSeed } from "../auth/session-seed";

/**
 * Org admin distributes the OMK to another active member via KEM + AEAD
 * (`orgs.keys.publishWrap`). Caller must hold `members:invite` permission.
 */
export function usePublishOrgMemberKeyWrap() {
	const { wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { targetWallet: Address }) => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet and auth required");
			}
			const me = wallet.account.address;
			const wrappedMine = await rpcQuery.orgs.keys.myWrap.call();

			const profile = await rpcQuery.users.profile.lookup.call({
				query: args.targetWallet,
			});
			const targetPk = profile.encryptionPublicKey;
			if (!targetPk) {
				throw new Error("Invitee has no encryption public key on profile");
			}

			const keySeed = getSessionSeed(me);
			if (!keySeed) {
				throw new Error("No unlocked key seed found");
			}

			const { privateKey } = await KEM.keyGen({
				seed: new Uint8Array(Array.from(keySeed)),
			});

			const { sharedSecret: ssSelf } = await KEM.decapsulate({
				ciphertext: toBytes(wrappedMine.wrapKemCiphertext),
				privateKeySelf: privateKey,
			});

			const omkSeed = await encryption.decrypt({
				ciphertext: toBytes(wrappedMine.wrappedOmk),
				secretKey: ssSelf,
				info: ORG_OMK_WRAP_INFO,
			});

			const { ciphertext: kemToTarget, sharedSecret: ssTarget } =
				await KEM.encapsulate({
					publicKeyOther: toBytes(targetPk),
				});

			const wrappedForTarget = await encryption.encrypt({
				message: omkSeed,
				secretKey: ssTarget,
				info: ORG_OMK_WRAP_INFO,
			});

			await rpcQuery.orgs.keys.publishWrap.call({
				targetWallet: args.targetWallet,
				wrappedOmk: toHex(wrappedForTarget),
				wrapKemCiphertext: toHex(kemToTarget),
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.key(),
			});
		},
	});
}
