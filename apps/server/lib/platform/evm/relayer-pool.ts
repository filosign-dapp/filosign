import { createHash, randomBytes } from "node:crypto";
import { getContracts } from "@filosign/evm";
import { zEvmPrivateKey } from "@filosign/shared/zod";
import {
	type Address,
	createWalletClient,
	getAddress,
	type Hex,
	keccak256,
	publicActions,
	stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import config from "@/config";
import env from "@/env";
import { getRedis } from "@/lib/platform/cache/session";
import {
	createServerChainRpcTransport,
	serverChainRpcTransportArgs,
} from "@/lib/platform/chain-rpc";
import { logger } from "@/lib/platform/pino";

export type RelayerPoolMember = {
	address: Address;
	privateKey: Hex;
	index: number;
};

const ORG_RELAY_LOCK_TTL_SEC = 120;
const ORG_RELAY_LOCK_MAX_HOLD_MS = 3 * 60 * 1000;
const ORG_RELAY_LOCK_HEARTBEAT_MS = 15_000;
const MAX_ORG_LOCK_ACQUIRE_ATTEMPTS = 120;
const ORG_LOCK_ACQUIRE_BASE_DELAY_MS = 50;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const EXTEND_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], ARGV[2])
else
  return 0
end
`;

let poolMembers: RelayerPoolMember[] | null = null;

const chainRpcArgs = serverChainRpcTransportArgs();
const { transport: chainRpcTransport } =
	createServerChainRpcTransport(chainRpcArgs);

function buildRelayerWalletClient(member: RelayerPoolMember) {
	const client = createWalletClient({
		chain: config.runtimeChain,
		transport: chainRpcTransport,
		account: privateKeyToAccount(member.privateKey),
	}).extend(publicActions);
	return client;
}

type RelayerWalletClient = ReturnType<typeof buildRelayerWalletClient>;

const relayerWalletClients = new Map<string, RelayerWalletClient>();

/** Test-only: clear cached pool parse between env mocks. */
export function resetRelayerPoolCacheForTests(): void {
	poolMembers = null;
	relayerWalletClients.clear();
}

function parseCsv(value: string): string[] {
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function parseRelayerPool(): RelayerPoolMember[] {
	if (poolMembers) return poolMembers;

	const addresses = parseCsv(env.RELAYER_POOL).map((entry) =>
		getAddress(entry),
	);
	const privateKeys = parseCsv(env.RELAYER_POOL_PRIVATE_KEYS).map((entry) =>
		zEvmPrivateKey().parse(entry),
	);

	if (addresses.length === 0) {
		throw new Error("RELAYER_POOL must list at least one relayer address");
	}
	if (addresses.length !== privateKeys.length) {
		throw new Error(
			"RELAYER_POOL and RELAYER_POOL_PRIVATE_KEYS must have the same length",
		);
	}

	const seen = new Set<string>();
	poolMembers = addresses.map((address, index) => {
		const norm = address.toLowerCase();
		if (seen.has(norm)) {
			throw new Error(`Duplicate relayer address in RELAYER_POOL: ${address}`);
		}
		seen.add(norm);
		const keyAddress = getAddress(
			privateKeyToAccount(privateKeys[index]).address,
		);
		if (keyAddress !== address) {
			throw new Error(
				`RELAYER_POOL_PRIVATE_KEYS[${index}] does not match RELAYER_POOL[${index}]`,
			);
		}
		return { address, privateKey: privateKeys[index], index };
	});

	return poolMembers;
}

export function relayerPoolAddresses(): Address[] {
	return parseRelayerPool().map((member) => member.address);
}

export function relayerPoolSize(): number {
	return parseRelayerPool().length;
}

export function getRelayerPoolMember(address: Address): RelayerPoolMember {
	const norm = getAddress(address).toLowerCase();
	const member = parseRelayerPool().find(
		(entry) => entry.address.toLowerCase() === norm,
	);
	if (!member) {
		throw new Error(`Relayer ${address} is not in RELAYER_POOL`);
	}
	return member;
}

function rendezvousIndex(seed: string, size: number): number {
	const hash = keccak256(stringToBytes(seed));
	return Number(BigInt(hash) % BigInt(size));
}

/** New piece routing: stable rendezvous on pieceCid across pool size N. */
export function routeRelayerForNewPiece(pieceCid: string): RelayerPoolMember {
	const pool = parseRelayerPool();
	return pool[rendezvousIndex(pieceCid, pool.length)];
}

export function routeRelayerForPiece(args: {
	pinnedRelayerAddress: Address | null | undefined;
	pieceCid: string;
}): RelayerPoolMember {
	if (args.pinnedRelayerAddress) {
		return getRelayerPoolMember(args.pinnedRelayerAddress);
	}
	return routeRelayerForNewPiece(args.pieceCid);
}

export function routeRelayerForOrg(args: {
	pinnedRelayerAddress: Address | null | undefined;
	organizationId: string;
}): RelayerPoolMember {
	if (args.pinnedRelayerAddress) {
		return getRelayerPoolMember(args.pinnedRelayerAddress);
	}
	const pool = parseRelayerPool();
	return pool[rendezvousIndex(args.organizationId, pool.length)];
}

/** Failover order for worker retries: primary index then (primary + k) % N. */
export function relayerFailoverMembers(
	primary: RelayerPoolMember,
): RelayerPoolMember[] {
	const pool = parseRelayerPool();
	const ordered: RelayerPoolMember[] = [primary];
	for (let offset = 1; offset < pool.length; offset += 1) {
		ordered.push(pool[(primary.index + offset) % pool.length]);
	}
	return ordered;
}

export function getRelayerWalletClient(address: Address): RelayerWalletClient {
	const norm = getAddress(address).toLowerCase();
	const cached = relayerWalletClients.get(norm);
	if (cached) return cached;

	const member = getRelayerPoolMember(address);
	const client = buildRelayerWalletClient(member);
	relayerWalletClients.set(norm, client);
	return client;
}

export function fsContractsForRelayer(relayerAddress: Address) {
	return getContracts({
		client: getRelayerWalletClient(relayerAddress),
		chainKey: config.chainKey,
	});
}

export function orgRelayLockKey(organizationId: string): string {
	return `fs:lock:org-relay:${organizationId}`;
}

function orgLockToken(): string {
	return createHash("sha256").update(randomBytes(16)).digest("hex");
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireOrgRelayLock(
	organizationId: string,
	token: string,
): Promise<boolean> {
	const key = orgRelayLockKey(organizationId);
	for (let attempt = 0; attempt < MAX_ORG_LOCK_ACQUIRE_ATTEMPTS; attempt += 1) {
		const acquired = await getRedis().send("SET", [
			key,
			token,
			"NX",
			"EX",
			String(ORG_RELAY_LOCK_TTL_SEC),
		]);
		if (acquired === "OK") return true;
		await sleep(ORG_LOCK_ACQUIRE_BASE_DELAY_MS + Math.min(attempt, 40) * 25);
	}
	return false;
}

async function releaseOrgRelayLock(
	organizationId: string,
	token: string,
): Promise<void> {
	const key = orgRelayLockKey(organizationId);
	try {
		await getRedis().send("EVAL", [RELEASE_LOCK_SCRIPT, "1", key, token]);
	} catch (err) {
		logger.warn({ err, key }, "org relay lock release failed");
	}
}

async function extendOrgRelayLock(
	organizationId: string,
	token: string,
): Promise<void> {
	const key = orgRelayLockKey(organizationId);
	try {
		await getRedis().send("EVAL", [
			EXTEND_LOCK_SCRIPT,
			"1",
			key,
			token,
			String(ORG_RELAY_LOCK_TTL_SEC),
		]);
	} catch (err) {
		logger.warn({ err, key }, "org relay lock extend failed");
	}
}

/** Serializes setOrgControllers per organization. */
export async function withOrgRelayLock<T>(
	organizationId: string,
	run: () => Promise<T>,
): Promise<T> {
	const token = orgLockToken();
	const acquired = await acquireOrgRelayLock(organizationId, token);
	if (!acquired) {
		throw new Error("org relay lock unavailable after retries");
	}
	const startedAt = Date.now();
	const heartbeat = setInterval(() => {
		if (Date.now() - startedAt > ORG_RELAY_LOCK_MAX_HOLD_MS) return;
		void extendOrgRelayLock(organizationId, token);
	}, ORG_RELAY_LOCK_HEARTBEAT_MS);
	try {
		return await run();
	} finally {
		clearInterval(heartbeat);
		await releaseOrgRelayLock(organizationId, token);
	}
}
