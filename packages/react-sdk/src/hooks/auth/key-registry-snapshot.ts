import type { FilosignContracts } from "@filosign/contracts";
import { DAY } from "../../constants";
import { filosignKeys } from "../../lib/query-keys";
import type { FilosignWallet } from "../../lib/wallet";

type Wallet = FilosignWallet;

export type StoredKeygenData = {
	saltSeed: `0x${string}`;
	saltChallenge: `0x${string}`;
	commitmentKem: `0x${string}`;
	commitmentSig: `0x${string}`;
};

export type KeyRegistrySnapshot = {
	isRegistered: boolean;
	storedKeygenData: StoredKeygenData | undefined;
};

const snapshotInFlight = new Map<string, Promise<KeyRegistrySnapshot>>();
const snapshotCache = new Map<
	string,
	{ fetchedAt: number; data: KeyRegistrySnapshot }
>();

/** Short TTL so wallet-client flicker + duplicate observers do not re-hit the chain. */
const SNAPSHOT_CACHE_MS = 30_000;

export function clearKeyRegistrySnapshotCache(address?: string) {
	if (address) {
		snapshotCache.delete(address.toLowerCase());
		return;
	}
	snapshotCache.clear();
}

export async function fetchKeyRegistrySnapshot(
	contracts: FilosignContracts,
	address: `0x${string}`,
): Promise<KeyRegistrySnapshot> {
	const key = address.toLowerCase();
	const cached = snapshotCache.get(key);
	if (cached && Date.now() - cached.fetchedAt < SNAPSHOT_CACHE_MS) {
		return cached.data;
	}

	const existing = snapshotInFlight.get(key);
	if (existing) return existing;

	const promise = (async (): Promise<KeyRegistrySnapshot> => {
		const [isRegistered, keygenTuple] = await Promise.all([
			contracts.FSKeyRegistry.read.isRegistered([address]),
			contracts.FSKeyRegistry.read.keygenData([address]),
		]);

		const [, saltSeed, saltChallenge, commitmentKem, commitmentSig] =
			keygenTuple;

		if (!saltSeed || !saltChallenge || !commitmentKem || !commitmentSig) {
			const empty: KeyRegistrySnapshot = {
				isRegistered,
				storedKeygenData: undefined,
			};
			snapshotCache.set(key, { fetchedAt: Date.now(), data: empty });
			return empty;
		}

		const data: KeyRegistrySnapshot = {
			isRegistered,
			storedKeygenData: {
				saltSeed,
				saltChallenge,
				commitmentKem,
				commitmentSig,
			},
		};
		snapshotCache.set(key, { fetchedAt: Date.now(), data });
		return data;
	})().finally(() => {
		snapshotInFlight.delete(key);
	});

	snapshotInFlight.set(key, promise);
	return promise;
}

export function keyRegistrySnapshotQueryOptions(
	contracts: FilosignContracts | null,
	wallet: Wallet | undefined,
) {
	const address = wallet?.account.address as `0x${string}` | undefined;

	return {
		queryKey: filosignKeys.keyRegistrySnapshot(address),
		queryFn: async (): Promise<KeyRegistrySnapshot> => {
			if (!contracts || !address) {
				throw new Error("unreachable");
			}
			return fetchKeyRegistrySnapshot(contracts, address);
		},
		staleTime: 1 * DAY,
		gcTime: 1 * DAY,
		enabled: Boolean(contracts && address),
	};
}
