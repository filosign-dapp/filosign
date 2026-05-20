const PREFIX = "filosign:auth";

export const authRedisKeys = {
	nonce: (wallet: string) => `${PREFIX}:nonce:${wallet.toLowerCase()}`,
	denyJti: (jti: string) => `${PREFIX}:deny:jti:${jti}`,
	refreshByHash: (hash: string) => `${PREFIX}:refresh:hash:${hash}`,
	refreshSuperseded: (hash: string) => `${PREFIX}:refresh:superseded:${hash}`,
	refreshFamilyHashes: (familyId: string) =>
		`${PREFIX}:refresh:family:${familyId}:hashes`,
	rateLimit: (route: string, id: string) => `${PREFIX}:rl:${route}:${id}`,
} as const;
