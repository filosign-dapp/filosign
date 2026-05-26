import { type Address, type Hex, isHex, verifyTypedData } from "viem";
import config from "@/config";
import { fsContracts } from "@/lib/platform/evm";

/** Off-chain registration domain (replaces FSKeyRegistry EIP-712). */
export const FILOSIGN_REGISTRATION_DOMAIN_NAME =
	"FilosignRegistration" as const;

const REGISTER_KEYGEN_TYPES = {
	RegisterKeygenData: [
		{ name: "from", type: "address" },
		{ name: "salt_pin", type: "bytes16" },
		{ name: "salt_seed", type: "bytes16" },
		{ name: "salt_challenge", type: "bytes16" },
		{ name: "commitment_kyber_pk", type: "bytes20" },
		{ name: "commitment_dilithium_pk", type: "bytes20" },
	],
} as const;

export async function validateFilosignRegistrationSignature(args: {
	walletAddress: Address;
	saltPin: Hex;
	saltSeed: Hex;
	saltChallenge: Hex;
	commitmentKem: Hex;
	commitmentSig: Hex;
	signature: Hex;
}): Promise<boolean> {
	const {
		walletAddress,
		saltPin,
		saltSeed,
		saltChallenge,
		commitmentKem,
		commitmentSig,
		signature,
	} = args;

	if (
		!isHex(signature) ||
		!isHex(saltPin) ||
		!isHex(saltSeed) ||
		!isHex(saltChallenge) ||
		!isHex(commitmentKem) ||
		!isHex(commitmentSig)
	) {
		return false;
	}

	return verifyTypedData({
		address: walletAddress,
		domain: {
			name: FILOSIGN_REGISTRATION_DOMAIN_NAME,
			version: "1",
			chainId: BigInt(config.runtimeChain.id),
			verifyingContract: fsContracts.FSFileRegistry.address,
		},
		types: REGISTER_KEYGEN_TYPES,
		primaryType: "RegisterKeygenData",
		message: {
			from: walletAddress,
			salt_pin: saltPin,
			salt_seed: saltSeed,
			salt_challenge: saltChallenge,
			commitment_kyber_pk: commitmentKem,
			commitment_dilithium_pk: commitmentSig,
		},
		signature,
	});
}
