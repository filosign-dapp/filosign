import {
	encryption,
	KEM,
	randomBytes,
	toBytes,
	toHex,
} from "@filosign/crypto-utils";
import {
	ORG_OMK_WRAP_INFO,
	templateDekWrapOmkInfo,
	templateDocumentInfo,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { getSessionSeed } from "../hooks/auth/session-seed";

export function generateTemplateDek(): Uint8Array {
	return randomBytes(32);
}

export async function encryptTemplateDocument(args: {
	dek: Uint8Array;
	templateId: string;
	docId: string;
	bytes: Uint8Array;
}): Promise<Uint8Array> {
	return encryption.encrypt({
		message: args.bytes,
		secretKey: args.dek,
		info: templateDocumentInfo(args.templateId, args.docId),
	});
}

export async function decryptTemplateDocument(args: {
	dek: Uint8Array;
	templateId: string;
	docId: string;
	ciphertext: Uint8Array;
}): Promise<Uint8Array> {
	return encryption.decrypt({
		ciphertext: args.ciphertext,
		secretKey: args.dek,
		info: templateDocumentInfo(args.templateId, args.docId),
	});
}

export async function wrapTemplateDekForOrg(args: {
	dek: Uint8Array;
	templateId: string;
	orgEncryptionPublicKey: Hex;
}): Promise<{ kemCiphertext: Hex; encryptedDek: Hex }> {
	const { ciphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.orgEncryptionPublicKey),
	});
	const encryptedDek = await encryption.encrypt({
		message: args.dek,
		secretKey: sharedSecret,
		info: templateDekWrapOmkInfo(args.templateId),
	});
	return {
		kemCiphertext: toHex(ciphertext),
		encryptedDek: toHex(encryptedDek),
	};
}

async function omkPrivateKeyFromMemberWrap(args: {
	wallet: Address;
	myWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
}) {
	const keySeed = getSessionSeed(args.wallet);
	if (!keySeed) throw new Error("No unlocked key seed found");

	const { privateKey: userKemPrivate } = await KEM.keyGen({
		seed: new Uint8Array(Array.from(keySeed)),
	});

	const { sharedSecret: ssSelf } = await KEM.decapsulate({
		ciphertext: toBytes(args.myWrap.wrapKemCiphertext),
		privateKeySelf: userKemPrivate,
	});
	const omkSeed = await encryption.decrypt({
		ciphertext: toBytes(args.myWrap.wrappedOmk),
		secretKey: ssSelf,
		info: ORG_OMK_WRAP_INFO,
	});
	return KEM.keyGen({ seed: omkSeed });
}

export async function decryptTemplateDekFromOrgHead(args: {
	templateId: string;
	headDekWrappedOmk: Hex;
	headOmkKemCiphertext: Hex;
	wallet: Address;
	myWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
}): Promise<Uint8Array> {
	const { privateKey: omkPrivate } = await omkPrivateKeyFromMemberWrap({
		wallet: args.wallet,
		myWrap: args.myWrap,
	});

	const { sharedSecret: ssOrg } = await KEM.decapsulate({
		ciphertext: toBytes(args.headOmkKemCiphertext),
		privateKeySelf: omkPrivate,
	});

	return encryption.decrypt({
		ciphertext: toBytes(args.headDekWrappedOmk),
		secretKey: ssOrg,
		info: templateDekWrapOmkInfo(args.templateId),
	});
}

export async function resolveTemplateDek(args: {
	templateId: string;
	headDekWrappedOmk: Hex;
	headOmkKemCiphertext: Hex;
	wallet: Address;
	myOrgWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
}): Promise<Uint8Array> {
	getAddress(args.wallet);
	return decryptTemplateDekFromOrgHead({
		templateId: args.templateId,
		headDekWrappedOmk: args.headDekWrappedOmk,
		headOmkKemCiphertext: args.headOmkKemCiphertext,
		wallet: args.wallet,
		myWrap: args.myOrgWrap,
	});
}
