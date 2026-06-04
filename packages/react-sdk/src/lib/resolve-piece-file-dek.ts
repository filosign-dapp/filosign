import { encryption, KEM, toBytes } from "@filosign/crypto-utils";
import { ORG_OMK_WRAP_INFO } from "@filosign/shared";
import type { Address, Hex } from "viem";
import { getSessionSeed } from "../hooks/auth/session-seed";

export type PieceFileDekSource = {
	pieceCid: string;
	kemCiphertext: string | null;
	encryptedEncryptionKey: string | null;
	orgKemCiphertext?: string | null;
	orgEncryptedEncryptionKey?: string | null;
	organizationId?: string | null;
};

export async function resolvePieceFileDek(args: {
	wallet: Address;
	detail: PieceFileDekSource;
	myOrgWrap?: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
}): Promise<Uint8Array> {
	const keySeed = getSessionSeed(args.wallet);
	if (!keySeed) {
		throw new Error("No unlocked key seed found");
	}

	const { privateKey: userKemPrivate } = await KEM.keyGen({
		seed: new Uint8Array(Array.from(keySeed)),
	});

	const orgId = args.detail.organizationId?.trim();
	const orgKem = args.detail.orgKemCiphertext?.trim();
	const orgEnc = args.detail.orgEncryptedEncryptionKey?.trim();

	if (orgId && orgKem && orgEnc && args.myOrgWrap) {
		const { sharedSecret: ssSelf } = await KEM.decapsulate({
			ciphertext: toBytes(args.myOrgWrap.wrapKemCiphertext),
			privateKeySelf: userKemPrivate,
		});
		const omkSeed = await encryption.decrypt({
			ciphertext: toBytes(args.myOrgWrap.wrappedOmk),
			secretKey: ssSelf,
			info: ORG_OMK_WRAP_INFO,
		});

		const { privateKey: omkPrivate } = await KEM.keyGen({
			seed: omkSeed,
		});

		const { sharedSecret: ssOrg } = await KEM.decapsulate({
			ciphertext: toBytes(orgKem),
			privateKeySelf: omkPrivate,
		});

		return encryption.decrypt({
			ciphertext: toBytes(orgEnc),
			secretKey: ssOrg,
			info: `${args.detail.pieceCid}:org:${orgId}`,
		});
	}

	const kemCiphertext = args.detail.kemCiphertext?.trim();
	const encryptedEncryptionKey = args.detail.encryptedEncryptionKey?.trim();
	if (!kemCiphertext || !encryptedEncryptionKey) {
		throw new Error("Cannot decrypt file: missing participant keys");
	}

	const { sharedSecret } = await KEM.decapsulate({
		ciphertext: toBytes(kemCiphertext),
		privateKeySelf: userKemPrivate,
	});

	return encryption.decrypt({
		ciphertext: toBytes(encryptedEncryptionKey),
		secretKey: sharedSecret,
		info: `${args.detail.pieceCid}:${args.wallet}`,
	});
}
