import jwt from "jsonwebtoken";
import { type Address, isAddress } from "viem";
import { z } from "zod";
import {
	JWTalgorithm,
	JWTexpiration,
	JWTissuer,
	JWTsigningSecret,
} from "@/constants";

const zEvmAddress = z
	.string()
	.refine((value) => isAddress(value), {
		error: "Invalid EVM address format",
	})
	.transform((value) => value as Address);

export const zJwtPayload = () =>
	z.object({
		iss: z.string(), // issuer
		sub: zEvmAddress, // subject (wallet address)
		iat: z.int(), // issued at
		exp: z.int(), // expires at
		nbf: z.int(), // not before
	});

export type JwtPayload = z.infer<ReturnType<typeof zJwtPayload>>;

export function createJwtPayload(walletAddress: Address): JwtPayload {
	const now = Math.floor(Date.now() / 1000);

	return {
		iss: JWTissuer,
		sub: walletAddress,
		iat: now - 2,
		exp: now + JWTexpiration,
		nbf: now - 1,
	};
}

export function signJwt(payload: JwtPayload): string {
	return jwt.sign(payload, JWTsigningSecret, {
		algorithm: JWTalgorithm,
	});
}

export function verifyJwt(token: string): JwtPayload {
	const decoded = jwt.verify(token, JWTsigningSecret, {
		algorithms: [JWTalgorithm],
	});

	return zJwtPayload().parse(decoded);
}

export function issueJwtToken(walletAddress: Address): string {
	const payload = createJwtPayload(walletAddress);
	return signJwt(payload);
}
