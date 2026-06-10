import {
	encryption,
	generateColdInvitePhrase,
	KEM,
	toBytes,
	toHex,
	wrapColdInviteDek,
} from "@filosign/crypto-utils";
import type { FilosignContracts } from "@filosign/evm";
import { computeCidIdentifier } from "@filosign/evm";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { Hex } from "viem";
import { getAddress } from "viem";
import { getSessionSeed } from "../hooks/auth/session-seed";

export type NewSignerE2eePayload =
	| {
			kind: "warm";
			wallet: `0x${string}`;
			kemCiphertext: `0x${string}`;
			encryptedEncryptionKey: `0x${string}`;
	  }
	| {
			kind: "cold";
			email: string;
			inviteToken: string;
			wrappedEncryptionKey: `0x${string}`;
	  };

async function decryptSenderDek(args: {
	pieceCid: string;
	walletAddress: `0x${string}`;
	kemCiphertext: Hex;
	encryptedEncryptionKey: Hex;
}): Promise<Uint8Array> {
	const keySeed = getSessionSeed(args.walletAddress);
	if (!keySeed) {
		throw new Error("Please unlock your wallet first");
	}
	const { privateKey } = await KEM.keyGen({
		seed: new Uint8Array(Array.from(keySeed)),
	});
	const wallet = getAddress(args.walletAddress);
	const { sharedSecret } = await KEM.decapsulate({
		ciphertext: toBytes(args.kemCiphertext),
		privateKeySelf: privateKey,
	});
	return encryption.decrypt({
		ciphertext: toBytes(args.encryptedEncryptionKey),
		secretKey: sharedSecret,
		info: `${args.pieceCid}:${wallet}`,
	});
}

/** Build server `newSignerE2ee` after decrypting the sender envelope. */
export async function buildNewSignerE2eeForAmend(args: {
	pieceCid: string;
	walletAddress: `0x${string}`;
	kemCiphertext: Hex;
	encryptedEncryptionKey: Hex;
	newEmail: string;
	/** When set, wrap for an on-platform recipient instead of cold invite. */
	newSignerWallet?: `0x${string}`;
	newSignerEncryptionPublicKey?: Hex;
}): Promise<NewSignerE2eePayload> {
	const dek = await decryptSenderDek(args);
	const normalizedEmail = normalizePlacementRecipientEmail(args.newEmail);

	if (args.newSignerWallet && args.newSignerEncryptionPublicKey) {
		const recipientWallet = getAddress(args.newSignerWallet);
		const { ciphertext, sharedSecret } = await KEM.encapsulate({
			publicKeyOther: toBytes(args.newSignerEncryptionPublicKey),
		});
		const encryptedEncryptionKey = await encryption.encrypt({
			message: dek,
			secretKey: sharedSecret,
			info: `${args.pieceCid}:${recipientWallet}`,
		});
		return {
			kind: "warm",
			wallet: recipientWallet,
			kemCiphertext: toHex(ciphertext),
			encryptedEncryptionKey: toHex(encryptedEncryptionKey),
		};
	}

	const phrase = generateColdInvitePhrase();
	const inviteToken = `0x${Array.from(
		crypto.getRandomValues(new Uint8Array(32)),
	)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")}`;
	const wrapped = await wrapColdInviteDek({ encryptionKey: dek, phrase });
	return {
		kind: "cold",
		email: normalizedEmail,
		inviteToken,
		wrappedEncryptionKey: `0x${Array.from(wrapped)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as `0x${string}`,
	};
}

function mergeSortedCommitments(
	required: readonly Hex[],
	optional: readonly Hex[],
): Hex[] {
	const merged: Hex[] = [];
	let i = 0;
	let j = 0;
	while (i < required.length && j < optional.length) {
		const req = required[i];
		const opt = optional[j];
		if (req === undefined || opt === undefined) break;
		if (req < opt) {
			merged.push(req);
			i++;
		} else {
			merged.push(opt);
			j++;
		}
	}
	while (i < required.length) {
		const req = required[i];
		if (req !== undefined) merged.push(req);
		i++;
	}
	while (j < optional.length) {
		const opt = optional[j];
		if (opt !== undefined) merged.push(opt);
		j++;
	}
	return merged;
}

export async function previewSignersCommitmentAfter(args: {
	contracts: FilosignContracts;
	requiredCommitments: Hex[];
	oldCommitment: Hex;
	newCommitment: Hex;
}): Promise<Hex> {
	const remaining = args.requiredCommitments.filter(
		(c) => c !== args.oldCommitment,
	);
	const roster = mergeSortedCommitments(remaining, [args.newCommitment]);
	return args.contracts.FSEnvelopeRegistry.read.computeEmailSignerCommitment([
		roster,
	]);
}

export { computeCidIdentifier };
