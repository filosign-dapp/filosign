/// <reference path="./argon2-browser.d.ts" />

import { long as EFF_WORDLIST } from "@wordlist/english-eff/long";
import * as encryption from "./impl/node/encryption";
import { randomBytes } from "./impl/node/utils";

const DEK_WRAP_INFO = "filosign:cold-invite-dek-v2";

export function attachmentPacketDekWrapInfo(packetId: string): string {
	return `filosign:attachment-packet-dek:v1:${packetId}`;
}

/** Argon2id parameters for cold-invite DEK wrapping (browser `argon2-browser` mem unit: KiB). */
export const COLD_INVITE_ARGON_PARAMS = {
	memory: 64 * 1024,
	time: 3,
	parallelism: 1,
	hashLen: 32,
} as const;

const ARGON_SALT_BYTES = 16;
const COLD_INVITE_PHRASE_WORDS = 6;

const ENGLISH_WORDLIST = EFF_WORDLIST;
const WORDLIST_SIZE = ENGLISH_WORDLIST.length;

function toArrayBufferU8(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(Array.from(bytes));
}

function uniformWordIndex(): number {
	const buf = new Uint8Array(2);
	const limit = WORDLIST_SIZE * Math.floor(65536 / WORDLIST_SIZE);
	while (true) {
		crypto.getRandomValues(buf);
		const hi = buf[0];
		const lo = buf[1];
		if (hi === undefined || lo === undefined) {
			throw new Error("random buffer underfilled");
		}
		const v = (hi << 8) | lo;
		// Rejection sampling removes modulo bias for arbitrary wordlist sizes.
		if (v < limit) {
			return v % WORDLIST_SIZE;
		}
	}
}

/**
 * Six random EFF long-list words, hyphen-separated (human-readable share code).
 * ~77.6 bits from word choice; Argon2id makes offline guessing costly.
 */
export function generateColdInvitePhrase(): string {
	const parts: string[] = [];
	for (let i = 0; i < COLD_INVITE_PHRASE_WORDS; i++) {
		const idx = uniformWordIndex();
		const w = ENGLISH_WORDLIST[idx];
		if (!w) {
			throw new Error("wordlist index out of range");
		}
		parts.push(w);
	}
	return parts.join("-");
}

/** Normalize user input: trim, lowercase, collapse spaces/underscores to hyphens. */
export function normalizeColdInvitePhrase(phrase: string): string {
	return (
		phrase
			.trim()
			.toLowerCase()
			// Common paste variants (email/clients swap ASCII hyphen for en/em dash).
			.replace(/[\u2013\u2014]/g, "-")
			.replace(/[,，;]+/g, "-")
			.replace(/[\s_]+/g, "-")
			.replace(/-+/g, "-")
	);
}

async function deriveColdInviteKeyFromPhrase(args: {
	phrase: string;
	argonSalt: Uint8Array;
}): Promise<Uint8Array> {
	const argon2Module = (await import(
		"argon2-browser/dist/argon2-bundled.min.js"
	)) as {
		hash?: (opts: {
			pass: string;
			salt: Uint8Array<ArrayBuffer>;
			type: number;
			mem: number;
			time: number;
			parallelism: number;
			hashLen: number;
		}) => Promise<{ hash: Uint8Array }>;
		ArgonType?: { Argon2id: number };
		default?: {
			hash: (opts: {
				pass: string;
				salt: Uint8Array<ArrayBuffer>;
				type: number;
				mem: number;
				time: number;
				parallelism: number;
				hashLen: number;
			}) => Promise<{ hash: Uint8Array }>;
			ArgonType: { Argon2id: number };
		};
	};
	const argon2 = argon2Module.default ?? argon2Module;
	if (!argon2?.hash || !argon2?.ArgonType?.Argon2id) {
		throw new Error("Argon2 module failed to load");
	}
	const pass = normalizeColdInvitePhrase(args.phrase);
	const out = await argon2.hash({
		pass,
		salt: toArrayBufferU8(args.argonSalt),
		type: argon2.ArgonType.Argon2id,
		mem: COLD_INVITE_ARGON_PARAMS.memory,
		time: COLD_INVITE_ARGON_PARAMS.time,
		parallelism: COLD_INVITE_ARGON_PARAMS.parallelism,
		hashLen: COLD_INVITE_ARGON_PARAMS.hashLen,
	});
	return new Uint8Array(out.hash);
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}

/** Wrap a DEK with an Argon2id-derived key from a passphrase (random salt prefix). */
export async function wrapPassphraseDek(args: {
	encryptionKey: Uint8Array;
	phrase: string;
	info: string;
}): Promise<Uint8Array> {
	const argonSalt = randomBytes(ARGON_SALT_BYTES);
	const secretKey = await deriveColdInviteKeyFromPhrase({
		phrase: args.phrase,
		argonSalt,
	});
	const body = await encryption.encrypt({
		message: args.encryptionKey,
		secretKey,
		info: args.info,
	});
	return concatBytes(argonSalt, body);
}

/** Unwrap a DEK from {@link wrapPassphraseDek}. */
export async function unwrapPassphraseDek(args: {
	wrappedEncryptionKey: Uint8Array;
	phrase: string;
	info: string;
}): Promise<Uint8Array> {
	const { wrappedEncryptionKey } = args;
	if (wrappedEncryptionKey.length < ARGON_SALT_BYTES + 12 + 32 + 16) {
		throw new Error("Invalid passphrase wrap payload");
	}
	const argonSalt = wrappedEncryptionKey.slice(0, ARGON_SALT_BYTES);
	const ciphertext = wrappedEncryptionKey.slice(ARGON_SALT_BYTES);
	const secretKey = await deriveColdInviteKeyFromPhrase({
		phrase: args.phrase,
		argonSalt,
	});
	return encryption.decrypt({
		ciphertext,
		secretKey,
		info: args.info,
	});
}

/** Wrap file DEK for a cold recipient: random Argon2 salt + AES payload (iv+ciphertext). */
export async function wrapColdInviteDek(args: {
	encryptionKey: Uint8Array;
	phrase: string;
}): Promise<Uint8Array> {
	return wrapPassphraseDek({
		encryptionKey: args.encryptionKey,
		phrase: args.phrase,
		info: DEK_WRAP_INFO,
	});
}

export async function unwrapColdInviteDek(args: {
	wrappedEncryptionKey: Uint8Array;
	phrase: string;
}): Promise<Uint8Array> {
	return unwrapPassphraseDek({
		wrappedEncryptionKey: args.wrappedEncryptionKey,
		phrase: args.phrase,
		info: DEK_WRAP_INFO,
	});
}
