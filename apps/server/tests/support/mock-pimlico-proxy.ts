import { getAddress } from "viem";

export const REGISTERED_SENDER = getAddress(
	"0x1111111111111111111111111111111111111111",
);

export const ALLOWED_ORIGIN = "https://app.example.com";

export const TEST_CHAIN_ID = 84_532;

export function sampleUserOp(sender = REGISTERED_SENDER) {
	return {
		sender,
		nonce: "0x0",
		callData: "0x",
	};
}

export function sponsorRequest(
	method = "pm_sponsorUserOperation",
	id: string | number = 1,
) {
	return {
		jsonrpc: "2.0" as const,
		method,
		params: [sampleUserOp(), "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"],
		id,
	};
}

export function readRequest(method = "eth_chainId", id: string | number = 1) {
	return {
		jsonrpc: "2.0" as const,
		method,
		params: [],
		id,
	};
}

export const testAllowedOrigins = [
	"https://app.example.com",
	"https://astro.example.com",
] as const;
