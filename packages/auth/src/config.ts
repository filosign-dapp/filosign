import {
	AUTH_NONCE_TTL_MS,
	AUTH_REFRESH_COOKIE_NAME,
	AUTH_REFRESH_COOKIE_PATH,
	JWT_ACCESS_AUD,
	JWT_ACCESS_EXPIRATION_SECONDS,
	JWT_ALGORITHM,
	JWT_REFRESH_EXPIRATION_SECONDS,
} from "./constants";

export type AuthJwtConfig = {
	secret: string;
	issuer: string;
	algorithm: typeof JWT_ALGORITHM;
	accessExpirationSeconds: number;
	audience: string;
};

export type AuthCookieConfig = {
	refreshCookieName: string;
	refreshCookiePath: string;
	refreshExpirationSeconds: number;
	secureCookies: boolean;
};

export type AuthConfig = {
	jwt: AuthJwtConfig;
	cookies: AuthCookieConfig;
	nonceTtlMs: number;
	refreshExpirationSeconds: number;
};

export function defaultAuthConfig(params: {
	jwtSecret: string;
	jwtIssuer: string;
	secureCookies: boolean;
}): AuthConfig {
	return {
		jwt: {
			secret: params.jwtSecret,
			issuer: params.jwtIssuer,
			algorithm: JWT_ALGORITHM,
			accessExpirationSeconds: JWT_ACCESS_EXPIRATION_SECONDS,
			audience: JWT_ACCESS_AUD,
		},
		cookies: {
			refreshCookieName: AUTH_REFRESH_COOKIE_NAME,
			refreshCookiePath: AUTH_REFRESH_COOKIE_PATH,
			refreshExpirationSeconds: JWT_REFRESH_EXPIRATION_SECONDS,
			secureCookies: params.secureCookies,
		},
		nonceTtlMs: AUTH_NONCE_TTL_MS,
		refreshExpirationSeconds: JWT_REFRESH_EXPIRATION_SECONDS,
	};
}
