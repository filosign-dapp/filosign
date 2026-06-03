import { encodePacked, fromHex, type Hex, keccak256, pad, toHex } from "viem";
import type { SignTypedDataParameters } from "viem/accounts";
import type { FilosignContracts } from "./contracts";

export function parsePieceCid(pieceCid: string) {
	const bytes = new TextEncoder().encode(pieceCid);
	const hex = toHex(bytes);

	const p1_bytes32 = `0x${hex.slice(2, 2 + 32 * 2)}` as const;

	const p2_bytes16 = `0x${hex.slice(2 + 32 * 2, 2 + 32 * 2 + 16 * 2)}` as const;

	const remainingHex = hex.slice(2 + 32 * 2 + 16 * 2);
	const p3_bytes32 = pad(`0x${remainingHex}`, {
		size: 32,
	});

	return {
		digestPrefix: p1_bytes32,
		digestBuffer: p2_bytes16,
		digestTail: p3_bytes32,
		length: bytes.length,
	};
}

export function rebuildPieceCid(options: {
	digestPrefix: Hex;
	digestBuffer: Hex;
	digestTail: Hex;
}) {
	const tailHex = options.digestTail.slice(2).replace(/^0+/, "");
	const reconstructedHex =
		`0x${options.digestPrefix.slice(2)}${options.digestBuffer.slice(2)}${tailHex}` as Hex;

	const reconstruct = fromHex(reconstructedHex, "bytes");
	const reconstructedString = new TextDecoder().decode(reconstruct);

	return reconstructedString;
}

export function computeCidIdentifier(pieceCid: string) {
	return keccak256(encodePacked(["string"], [pieceCid]));
}

export const FILOSIGN_REGISTRATION_DOMAIN_NAME =
	"FilosignRegistration" as const;

export async function filosignRegistrationSignature(
	contracts: FilosignContracts,
	args: Omit<SignTypedDataParameters, "domain" | "privateKey">,
) {
	const domain = {
		name: FILOSIGN_REGISTRATION_DOMAIN_NAME,
		version: "1",
		chainId: contracts.$client.chain.id,
		verifyingContract: contracts.FSEnvelopeRegistry.address,
	};

	return contracts.$client.signTypedData({
		domain,
		...args,
	});
}

export async function eip712signature(
	contracts: FilosignContracts,
	contractName: keyof Pick<FilosignContracts, "FSEnvelopeRegistry">,
	args: Omit<SignTypedDataParameters, "domain" | "privateKey">,
	options?: { verifyingContract?: `0x${string}` },
) {
	const domain = {
		name: contractName,
		version: contractName === "FSEnvelopeRegistry" ? "4" : "1",
		chainId: contracts.$client.chain.id,
		verifyingContract:
			options?.verifyingContract ?? contracts[contractName].address,
	};

	return contracts.$client.signTypedData({
		domain,
		...args,
	});
}
