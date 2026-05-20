import jwt from "jsonwebtoken";
import { type Address, isAddress } from "viem";
import { z } from "zod";
import type { AuthJwtConfig } from "./config";
import { JWT_ACCESS_AUD, JWT_ACCESS_TYP } from "./constants";

const zEvmAddress = z
	.string()
	.refine((value) => isAddress(value), {
		error: "Invalid EVM address format",
	})
	.transform((value) => value as Address);

export function createAuthJwt(config: AuthJwtConfig) {
	const zJwtPayload = () =>
		z.object({
			iss: z.string(),
			sub: zEvmAddress,
			iat: z.int(),
			exp: z.int(),
			nbf: z.int(),
			jti: z.string().min(1),
			typ: z.literal(JWT_ACCESS_TYP),
			aud: z.union([z.string(), z.array(z.string())]),
		});

	type JwtPayload = z.infer<ReturnType<typeof zJwtPayload>>;

	function isAccessToken(payload: JwtPayload): boolean {
		return payload.typ === JWT_ACCESS_TYP;
	}

	function createAccessJwtPayload(walletAddress: Address): JwtPayload {
		const now = Math.floor(Date.now() / 1000);
		return {
			iss: config.issuer,
			sub: walletAddress,
			iat: now - 2,
			exp: now + config.accessExpirationSeconds,
			nbf: now - 1,
			jti: crypto.randomUUID(),
			typ: JWT_ACCESS_TYP,
			aud: config.audience,
		};
	}

	function signJwt(payload: JwtPayload): string {
		return jwt.sign(payload, config.secret, {
			algorithm: config.algorithm,
		});
	}

	function verifyJwt(token: string): JwtPayload {
		const decoded = jwt.verify(token, config.secret, {
			algorithms: [config.algorithm],
			audience: config.audience,
		});
		const payload = zJwtPayload().parse(decoded);
		if (!isAccessToken(payload)) {
			throw new Error("Invalid token type");
		}
		return payload;
	}

	function issueAccessJwtToken(walletAddress: Address): {
		token: string;
		jti: string;
		exp: number;
	} {
		const payload = createAccessJwtPayload(walletAddress);
		return {
			token: signJwt(payload),
			jti: payload.jti,
			exp: payload.exp,
		};
	}

	return {
		JWT_ACCESS_TYP,
		JWT_ACCESS_AUD,
		isAccessToken,
		createAccessJwtPayload,
		verifyJwt,
		issueAccessJwtToken,
	};
}

export type AuthJwt = ReturnType<typeof createAuthJwt>;
