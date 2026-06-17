import type { signatures } from "@filosign/crypto-utils";
import { toHex, walletKeyGen } from "@filosign/crypto-utils";
import type { FilosignContracts } from "@filosign/evm";
import { filosignRegistrationSignature } from "@filosign/evm";
import type { QueryClient } from "@tanstack/react-query";
import type { FilosignRpcQueryUtils } from "../../context/FilosignContext";
import {
	clearKeyRegistrySnapshotCache,
	type StoredKeygenData,
} from "../../hooks/auth/key-registry-snapshot";
import { recoveryPhraseFromSeed } from "../../hooks/auth/recovery-phrase";
import { setSessionSeed } from "../../hooks/auth/session-seed";
import { unlockSeedFromWallet } from "../../hooks/auth/unlock-seed";
import type { FilosignWallet } from "../wallet";

export const LOGIN_RECOVERY_PHRASE_REQUIRED = "RECOVERY_PHRASE_REQUIRED";

export interface RegistrationAccessGate {
	platformInviteToken?: string;
	setupToken?: string;
	coldInviteToken?: string;
	coldRecipientEmail?: string;
}

export interface LoginParams {
	idToken?: string;
	/** Only unlock in-memory seed for an already registered user. */
	unlockOnly?: boolean;
	accessGate?: RegistrationAccessGate;
}

export type LoginResult =
	| { success: true }
	| { success: true; recoveryPhrase: string };

type DilithiumInstance = Parameters<typeof signatures.keyGen>[0]["dl"];

export type LoginDeps = {
	contracts: FilosignContracts;
	wallet: FilosignWallet;
	wasm: { dilithium: DilithiumInstance };
	rpcQuery: FilosignRpcQueryUtils;
	queryClient: QueryClient;
	isRegistered: boolean | undefined;
	isCryptoUnlocked: boolean | undefined;
	storedKeygenData: StoredKeygenData | undefined;
	invalidateAuthQueries: (
		queryClient: QueryClient,
		address: `0x${string}`,
	) => Promise<void>;
	invalidateSessionQueries: (
		queryClient: QueryClient,
		address: `0x${string}`,
	) => Promise<void>;
	invalidateUserProfile: (
		queryClient: QueryClient,
		rpcQuery: FilosignRpcQueryUtils,
	) => void;
};

async function unlockRegisteredSeed(deps: LoginDeps): Promise<void> {
	const seedFromWallet = await unlockSeedFromWallet({
		wallet: deps.wallet,
		contracts: deps.contracts,
		wasm: deps.wasm,
		storedKeygenData: deps.storedKeygenData,
	});
	if (seedFromWallet) {
		setSessionSeed(deps.wallet.account.address, seedFromWallet);
		return;
	}
	throw new Error(LOGIN_RECOVERY_PHRASE_REQUIRED);
}

async function registerNewUser(
	deps: LoginDeps,
	params: LoginParams,
): Promise<string> {
	const { idToken } = params;
	if (!idToken?.trim()) {
		throw new Error(
			"Authentication token required. Please sign in with your wallet first.",
		);
	}

	const keygenData = await walletKeyGen(deps.wallet, {
		dl: deps.wasm.dilithium,
	});

	const walletAddress = deps.wallet.account.address;
	const signature = await filosignRegistrationSignature(deps.contracts, {
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

	await deps.rpcQuery.users.register.call({
		signature,
		saltPin: keygenData.saltPin,
		saltSeed: keygenData.saltSeed,
		saltChallenge: keygenData.saltChallenge,
		commitmentKem: keygenData.commitmentKem,
		commitmentSig: keygenData.commitmentSig,
		encryptionPublicKey: toHex(keygenData.kemKeypair.publicKey),
		signaturePublicKey: toHex(keygenData.sigKeypair.publicKey),
		walletAddress: deps.wallet.account.address,
		idToken,
		...(params.accessGate?.platformInviteToken
			? { platformInviteToken: params.accessGate.platformInviteToken }
			: {}),
		...(params.accessGate?.setupToken
			? { setupToken: params.accessGate.setupToken }
			: {}),
		...(params.accessGate?.coldInviteToken
			? { coldInviteToken: params.accessGate.coldInviteToken }
			: {}),
		...(params.accessGate?.coldRecipientEmail
			? { coldRecipientEmail: params.accessGate.coldRecipientEmail }
			: {}),
	});

	setSessionSeed(deps.wallet.account.address, keygenData.seed);
	clearKeyRegistrySnapshotCache(deps.wallet.account.address);
	return recoveryPhraseFromSeed(keygenData.seedCore32);
}

export async function performLogin(
	deps: LoginDeps,
	params: LoginParams,
): Promise<LoginResult> {
	if (deps.isCryptoUnlocked) return { success: true };

	const address = deps.wallet.account.address as `0x${string}`;
	let recoveryPhrase: string | undefined;

	if (params.unlockOnly) {
		if (!deps.isRegistered) {
			throw new Error("User is not registered");
		}
		await unlockRegisteredSeed(deps);
	} else if (!deps.isRegistered) {
		recoveryPhrase = await registerNewUser(deps, params);
	} else {
		await unlockRegisteredSeed(deps);
	}

	if (!deps.isRegistered) {
		await deps.invalidateAuthQueries(deps.queryClient, address);
	} else {
		await deps.invalidateSessionQueries(deps.queryClient, address);
	}
	deps.invalidateUserProfile(deps.queryClient, deps.rpcQuery);

	return recoveryPhrase ? { success: true, recoveryPhrase } : { success: true };
}
