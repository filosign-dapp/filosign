import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	CACHE_TTL,
	cacheAside,
	cacheKeys,
	defaultDeserialize,
	defaultSerialize,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { users } from "@/lib/platform/db/schema/user";

async function fetchUserExists(wallet: Address): Promise<boolean> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, walletNorm))
		.limit(1);
	return Boolean(row);
}

export async function isUserRegistered(wallet: Address): Promise<boolean> {
	return cacheAside({
		key: cacheKeys.userExists(getAddress(wallet)),
		ttlSec: CACHE_TTL.userExists,
		fetch: () => fetchUserExists(wallet),
		serialize: defaultSerialize,
		deserialize: defaultDeserialize,
	});
}
