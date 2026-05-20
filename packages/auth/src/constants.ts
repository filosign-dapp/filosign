export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const JWT_ALGORITHM = "HS512" as const;
export const JWT_ACCESS_TYP = "access" as const;
export const JWT_ACCESS_AUD = "filosign-api" as const;

/** Access JWT lifetime (seconds). */
export const JWT_ACCESS_EXPIRATION_SECONDS = (30 * MINUTE_MS) / 1000;
/** Refresh cookie lifetime (seconds). */
export const JWT_REFRESH_EXPIRATION_SECONDS = (14 * DAY_MS) / 1000;
export const AUTH_NONCE_TTL_MS = 5 * MINUTE_MS;
export const AUTH_REFRESH_COOKIE_NAME = "filosign_refresh";
export const AUTH_REFRESH_COOKIE_PATH = "/api";
