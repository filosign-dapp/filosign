import type { Address } from "viem";

/** Stable private object key for the signed-in user's WebP avatar (`storage.presignPut` + `profile.update`). */
export function userAvatarWebpKey(wallet: Address): string {
	return `avatars/${wallet}.webp`;
}
