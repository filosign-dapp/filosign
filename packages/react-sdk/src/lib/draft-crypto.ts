import {
	encryption,
	generateColdInvitePhrase,
	jsonStringify,
	KEM,
	randomBytes,
	toBytes,
	toHex,
	unwrapPassphraseDek,
	wrapPassphraseDek,
} from "@filosign/crypto-utils";
import {
	type DraftSnapshot,
	draftCommentInfo,
	draftDekWrapExternalInfo,
	draftDekWrapOmkInfo,
	draftDekWrapUserInfo,
	draftDocumentInfo,
	draftReviewLinkInfo,
	draftSnapshotInfo,
	ORG_OMK_WRAP_INFO,
	zDraftSnapshot,
} from "@filosign/shared";
import { type Address, getAddress, type Hex } from "viem";
import { getSessionSeed } from "../hooks/auth/session-seed";

export function generateDraftDek(): Uint8Array {
	return randomBytes(32);
}

export async function encryptDraftSnapshot(args: {
	dek: Uint8Array;
	draftId: string;
	snapshot: DraftSnapshot;
}): Promise<Uint8Array> {
	const bytes = new TextEncoder().encode(jsonStringify(args.snapshot));
	return encryption.encrypt({
		message: bytes,
		secretKey: args.dek,
		info: draftSnapshotInfo(args.draftId),
	});
}

export async function decryptDraftSnapshot(args: {
	dek: Uint8Array;
	draftId: string;
	ciphertext: Uint8Array;
}): Promise<DraftSnapshot> {
	const plain = await encryption.decrypt({
		ciphertext: args.ciphertext,
		secretKey: args.dek,
		info: draftSnapshotInfo(args.draftId),
	});
	const json = new TextDecoder().decode(plain);
	return zDraftSnapshot.parse(JSON.parse(json));
}

export async function encryptDraftDocument(args: {
	dek: Uint8Array;
	draftId: string;
	docId: string;
	bytes: Uint8Array;
}): Promise<Uint8Array> {
	return encryption.encrypt({
		message: args.bytes,
		secretKey: args.dek,
		info: draftDocumentInfo(args.draftId, args.docId),
	});
}

export async function decryptDraftDocument(args: {
	dek: Uint8Array;
	draftId: string;
	docId: string;
	ciphertext: Uint8Array;
}): Promise<Uint8Array> {
	return encryption.decrypt({
		ciphertext: args.ciphertext,
		secretKey: args.dek,
		info: draftDocumentInfo(args.draftId, args.docId),
	});
}

export async function wrapDraftDekForOrg(args: {
	dek: Uint8Array;
	draftId: string;
	orgEncryptionPublicKey: Hex;
}): Promise<{ kemCiphertext: Hex; encryptedDek: Hex }> {
	const { ciphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.orgEncryptionPublicKey),
	});
	const encryptedDek = await encryption.encrypt({
		message: args.dek,
		secretKey: sharedSecret,
		info: draftDekWrapOmkInfo(args.draftId),
	});
	return {
		kemCiphertext: toHex(ciphertext),
		encryptedDek: toHex(encryptedDek),
	};
}

export async function wrapDraftDekForUser(args: {
	dek: Uint8Array;
	draftId: string;
	userEncryptionPublicKey: Hex;
	wallet: Address;
}): Promise<{ kemCiphertext: Hex; encryptedDek: Hex }> {
	const { ciphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.userEncryptionPublicKey),
	});
	const encryptedDek = await encryption.encrypt({
		message: args.dek,
		secretKey: sharedSecret,
		info: draftDekWrapUserInfo(args.draftId, args.wallet),
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

export async function decryptDraftDekFromOrgHead(args: {
	draftId: string;
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
		info: draftDekWrapOmkInfo(args.draftId),
	});
}

export async function decryptDraftDekFromUserHead(args: {
	draftId: string;
	headDekWrappedCreator: Hex;
	headCreatorKemCiphertext: Hex;
	wallet: Address;
}): Promise<Uint8Array> {
	const keySeed = getSessionSeed(args.wallet);
	if (!keySeed) throw new Error("No unlocked key seed found");

	const { privateKey } = await KEM.keyGen({
		seed: new Uint8Array(Array.from(keySeed)),
	});

	const { sharedSecret } = await KEM.decapsulate({
		ciphertext: toBytes(args.headCreatorKemCiphertext),
		privateKeySelf: privateKey,
	});

	return encryption.decrypt({
		ciphertext: toBytes(args.headDekWrappedCreator),
		secretKey: sharedSecret,
		info: draftDekWrapUserInfo(args.draftId, args.wallet),
	});
}

export async function buildWarmExternalShare(args: {
	dek: Uint8Array;
	draftId: string;
	inviteToken: string;
	recipientEncryptionPublicKey: Hex;
	recipientWallet: Address;
}): Promise<{ kemCiphertext: Hex; encryptedDek: Hex }> {
	getAddress(args.recipientWallet);
	const { ciphertext: kemCiphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.recipientEncryptionPublicKey),
	});
	const encryptedDek = await encryption.encrypt({
		message: args.dek,
		secretKey: sharedSecret,
		info: draftDekWrapExternalInfo(args.draftId, args.inviteToken),
	});
	return {
		kemCiphertext: toHex(kemCiphertext),
		encryptedDek: toHex(encryptedDek),
	};
}

export async function buildColdExternalShare(args: {
	dek: Uint8Array;
	draftId: string;
	inviteToken: string;
}): Promise<{ wrappedDek: Hex; phrase: string }> {
	const phrase = generateColdInvitePhrase();
	const wrapped = await wrapPassphraseDek({
		encryptionKey: args.dek,
		phrase,
		info: draftReviewLinkInfo(args.draftId, args.inviteToken),
	});
	return { wrappedDek: toHex(wrapped), phrase };
}

export async function decryptDraftDekFromColdShare(args: {
	wrappedDek: Hex;
	phrase: string;
	draftId: string;
	inviteToken: string;
}): Promise<Uint8Array> {
	return unwrapPassphraseDek({
		wrappedEncryptionKey: toBytes(args.wrappedDek),
		phrase: args.phrase,
		info: draftReviewLinkInfo(args.draftId, args.inviteToken),
	});
}

export async function encryptDraftComment(args: {
	dek: Uint8Array;
	draftId: string;
	commentId: string;
	body: string;
}): Promise<Uint8Array> {
	const bytes = new TextEncoder().encode(args.body);
	return encryption.encrypt({
		message: bytes,
		secretKey: args.dek,
		info: draftCommentInfo(args.draftId, args.commentId),
	});
}

export async function decryptDraftComment(args: {
	dek: Uint8Array;
	draftId: string;
	commentId: string;
	ciphertext: Uint8Array;
}): Promise<string> {
	const plain = await encryption.decrypt({
		ciphertext: args.ciphertext,
		secretKey: args.dek,
		info: draftCommentInfo(args.draftId, args.commentId),
	});
	return new TextDecoder().decode(plain);
}

export async function decryptDraftDekFromWarmShare(args: {
	kemCiphertext: Hex;
	encryptedDek: Hex;
	draftId: string;
	inviteToken: string;
	wallet: Address;
}): Promise<Uint8Array> {
	const keySeed = getSessionSeed(args.wallet);
	if (!keySeed) throw new Error("No unlocked key seed found");

	const { privateKey } = await KEM.keyGen({
		seed: new Uint8Array(Array.from(keySeed)),
	});

	const { sharedSecret } = await KEM.decapsulate({
		ciphertext: toBytes(args.kemCiphertext),
		privateKeySelf: privateKey,
	});

	return encryption.decrypt({
		ciphertext: toBytes(args.encryptedDek),
		secretKey: sharedSecret,
		info: draftDekWrapExternalInfo(args.draftId, args.inviteToken),
	});
}
