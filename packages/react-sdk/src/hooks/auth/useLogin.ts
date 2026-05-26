import { filosignRegistrationSignature } from "@filosign/contracts";
import { toHex, walletKeyGen } from "@filosign/crypto-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateUserProfile } from "../../lib/invalidate-user-profile";
import { filosignKeys } from "../../lib/query-keys";
import {
	invalidateAuthQueries,
	invalidateSessionQueries,
} from "./invalidate-auth-queries";
import type { KeyRegistrySnapshot } from "./key-registry-snapshot";
import { clearKeyRegistrySnapshotCache } from "./key-registry-snapshot";
import { recoveryPhraseFromSeed } from "./recovery-phrase";
import { setSessionSeed } from "./session-seed";
import { unlockSeedFromWallet } from "./unlock-seed";
import { useCryptoUnlocked } from "./useCryptoUnlocked";
import { useIsRegistered } from "./useIsRegistered";

export const LOGIN_RECOVERY_PHRASE_REQUIRED = "RECOVERY_PHRASE_REQUIRED";

export interface LoginParams {
	idToken?: string;
	/** Only unlock in-memory seed for an already registered user. */
	unlockOnly?: boolean;
}

export function useLogin() {
	const { rpcQuery, contracts, wallet, wasm } = useFilosignContext();
	const queryClient = useQueryClient();

	const { data: isRegistered } = useIsRegistered();
	const { data: isCryptoUnlocked } = useCryptoUnlocked();

	return useMutation({
		mutationFn: async (params: LoginParams) => {
			if (isCryptoUnlocked) return { success: true };

			if (!contracts || !wallet || !wasm.dilithium) {
				throw new Error("unreachable");
			}

			const address = wallet.account.address;
			const snapshot = queryClient.getQueryData<KeyRegistrySnapshot>(
				filosignKeys.keyRegistrySnapshot(address),
			);

			let recoveryPhrase: string | undefined;

			if (params.unlockOnly) {
				if (!isRegistered) {
					throw new Error("User is not registered");
				}
				const seedFromWallet = await unlockSeedFromWallet({
					wallet,
					contracts,
					wasm,
					storedKeygenData: snapshot?.storedKeygenData,
				});
				if (seedFromWallet) {
					setSessionSeed(wallet.account.address, seedFromWallet);
				} else {
					throw new Error(LOGIN_RECOVERY_PHRASE_REQUIRED);
				}
			} else if (!isRegistered) {
				const { idToken } = params;
				if (!idToken?.trim()) {
					throw new Error(
						"Authentication token required. Please sign in with your wallet first.",
					);
				}

				const keygenData = await walletKeyGen(wallet, {
					dl: wasm.dilithium,
				});

				const walletAddress = wallet.account.address;
				const signature = await filosignRegistrationSignature(contracts, {
					types: {
						RegisterKeygenData: [
							{ name: "from", type: "address" },
							{ name: "salt_pin", type: "bytes16" },
							{ name: "salt_seed", type: "bytes16" },
							{ name: "salt_challenge", type: "bytes16" },
							{ name: "commitment_kyber_pk", type: "bytes20" },
							{ name: "commitment_dilithium_pk", type: "bytes20" },
						],
					},
					primaryType: "RegisterKeygenData",
					message: {
						from: walletAddress,
						salt_pin: keygenData.saltPin,
						salt_seed: keygenData.saltSeed,
						salt_challenge: keygenData.saltChallenge,
						commitment_kyber_pk: keygenData.commitmentKem,
						commitment_dilithium_pk: keygenData.commitmentSig,
					},
				});

				await rpcQuery.users.register.call({
					signature,
					saltPin: keygenData.saltPin,
					saltSeed: keygenData.saltSeed,
					saltChallenge: keygenData.saltChallenge,
					commitmentKem: keygenData.commitmentKem,
					commitmentSig: keygenData.commitmentSig,
					encryptionPublicKey: toHex(keygenData.kemKeypair.publicKey),
					signaturePublicKey: toHex(keygenData.sigKeypair.publicKey),
					walletAddress: wallet.account.address,
					idToken,
				});

				setSessionSeed(wallet.account.address, keygenData.seed);
				clearKeyRegistrySnapshotCache(address);
				recoveryPhrase = recoveryPhraseFromSeed(keygenData.seedCore32);
			} else {
				const seedFromWallet = await unlockSeedFromWallet({
					wallet,
					contracts,
					wasm,
					storedKeygenData: snapshot?.storedKeygenData,
				});

				if (seedFromWallet) {
					setSessionSeed(wallet.account.address, seedFromWallet);
				} else {
					throw new Error(LOGIN_RECOVERY_PHRASE_REQUIRED);
				}
			}

			if (!isRegistered) {
				await invalidateAuthQueries(queryClient, address);
			} else {
				await invalidateSessionQueries(queryClient, address);
			}
			void invalidateUserProfile(queryClient, rpcQuery);
			return recoveryPhrase
				? { success: true, recoveryPhrase }
				: { success: true };
		},
	});
}
