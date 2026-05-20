import {
	AUTH_NONCE_TTL_MS,
	AUTH_REFRESH_COOKIE_NAME,
	AUTH_REFRESH_COOKIE_PATH,
	JWT_ACCESS_EXPIRATION_SECONDS,
	JWT_ALGORITHM,
	JWT_REFRESH_EXPIRATION_SECONDS,
} from "@filosign/auth/constants";
import env from "@/env";

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const KB = 1024;
export const MB = 1024 * KB;

export const MAX_FILE_SIZE = 30 * MB;

export {
	AUTH_NONCE_TTL_MS,
	AUTH_REFRESH_COOKIE_NAME,
	AUTH_REFRESH_COOKIE_PATH,
	JWT_ACCESS_EXPIRATION_SECONDS,
	JWT_REFRESH_EXPIRATION_SECONDS,
};
export const JWTalgorithm = JWT_ALGORITHM;
/** @deprecated Use JWT_ACCESS_EXPIRATION_SECONDS from @filosign/auth */
export const JWTexpiration = JWT_ACCESS_EXPIRATION_SECONDS;
/** HS512 key material; must not be derived from chain keys */
export const JWTsigningSecret = env.JWT_SECRET;

export const DOMAIN = "https://filosign.xyz";
export const URI = "https://filosign.xyz";

/** JWT `iss` claim */
export const JWTissuer = DOMAIN;
