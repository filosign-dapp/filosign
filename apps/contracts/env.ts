import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const privateKey = z
	.string()
	.regex(/^0x[0-9a-fA-F]{64}$/, "Expected a 32-byte hex private key");

export const env = createEnv({
	server: {
		/** Required for deploy / live networks only; Hardhat unit tests use the in-process network. */
		FC_PVT_KEY: privateKey.optional(),
		/** KMS relayer → `FSFileRegistry.server` (required on testnet/mainnet deploy). */
		FC_SERVER_ADDRESS: z
			.string()
			.regex(/^0x[0-9a-fA-F]{40}$/)
			.optional(),
		ALCHEMY_API_KEY: z.string().min(1).optional(),
		ETHERSCAN_API_KEY: z.string().min(1).optional(),
		BLOCKSCOUT_API_KEY: z.string().min(1).optional(),
	},
	// Hardhat loads this file under Node/ts-node — not Bun.
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

export default env;
