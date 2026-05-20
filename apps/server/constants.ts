import env from "@/env";

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const KB = 1024;
export const MB = 1024 * KB;

export const MAX_FILE_SIZE = 30 * MB;

export const JWTalgorithm = "HS512";
export const JWTexpiration = (3 * HOUR) / 1000; // 3 hours
/** HS512 key material; must not be derived from chain keys */
export const JWTsigningSecret = env.JWT_SECRET;

export const DOMAIN = "https://filosign.xyz";
export const URI = "https://filosign.xyz";

/** JWT `iss` claim */
export const JWTissuer = DOMAIN;
