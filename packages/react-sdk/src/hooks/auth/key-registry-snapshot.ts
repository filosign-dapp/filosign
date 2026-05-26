import { DAY } from "../../constants";
import { filosignKeys } from "../../lib/query-keys";
import type { FilosignWallet } from "../../lib/wallet";
import type { AppRouterClient } from "../../orpc/app-router-types";

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

const SNAPSHOT_CACHE_MS = 30_000;

export function clearKeyRegistrySnapshotCache(address?: string) {
	if (address) {
		snapshotCache.delete(address.toLowerCase());
		return;
	}
	snapshotCache.clear();
}

export async function fetchKeyRegistrySnapshot(
	rpc: AppRouterClient,
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
		const row = await rpc.users.registrationSnapshot({
			walletAddress: address,
		});

		if (!row.isRegistered || !row.storedKeygenData) {
			const empty: KeyRegistrySnapshot = {
				isRegistered: row.isRegistered,
				storedKeygenData: undefined,
			};
			snapshotCache.set(key, { fetchedAt: Date.now(), data: empty });
			return empty;
		}

		const data: KeyRegistrySnapshot = {
			isRegistered: true,
			storedKeygenData: {
				saltSeed: row.storedKeygenData.saltSeed as `0x${string}`,
				saltChallenge: row.storedKeygenData.saltChallenge as `0x${string}`,
				commitmentKem: row.storedKeygenData.commitmentKem as `0x${string}`,
				commitmentSig: row.storedKeygenData.commitmentSig as `0x${string}`,
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
	rpc: AppRouterClient | null,
	wallet: Wallet | undefined,
) {
	const address = wallet?.account.address as `0x${string}` | undefined;

	return {
		queryKey: filosignKeys.keyRegistrySnapshot(address),
		queryFn: async (): Promise<KeyRegistrySnapshot> => {
			if (!rpc || !address) {
				throw new Error("unreachable");
			}
			return fetchKeyRegistrySnapshot(rpc, address);
		},
		staleTime: 1 * DAY,
		gcTime: 1 * DAY,
		enabled: Boolean(rpc && address),
	};
}
