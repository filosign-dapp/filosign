import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import { JWT_ACCESS_AUD, JWT_ACCESS_TYP } from "./constants";
import { createAuthJwt } from "./jwt";

const wallet = getAddress("0x0000000000000000000000000000000000000001");

const authJwt = createAuthJwt({
	secret: "x".repeat(32),
	issuer: "https://filosign.xyz",
	algorithm: "HS512",
	accessExpirationSeconds: 30 * 60,
	audience: JWT_ACCESS_AUD,
});

describe("access JWT", () => {
	test("issues typ access with jti and aud", () => {
		const { token } = authJwt.issueAccessJwtToken(wallet);
		const payload = authJwt.verifyJwt(token);
		expect(payload.typ).toBe(JWT_ACCESS_TYP);
		expect(payload.jti.length).toBeGreaterThan(0);
		expect(payload.aud).toBe(JWT_ACCESS_AUD);
		expect(authJwt.isAccessToken(payload)).toBe(true);
	});

	test("rejects tampered token", () => {
		const { token } = authJwt.issueAccessJwtToken(wallet);
		expect(() => authJwt.verifyJwt(`${token}x`)).toThrow();
	});

	test("payload exp within 30 minutes", () => {
		const payload = authJwt.createAccessJwtPayload(wallet);
		const now = Math.floor(Date.now() / 1000);
		expect(payload.exp - now).toBeLessThanOrEqual(30 * 60 + 5);
		expect(payload.exp - now).toBeGreaterThan(29 * 60);
	});
});
