import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const privateKey = z
	.string()
	.regex(/^0x[0-9a-fA-F]{64}$/, "Expected a 32-byte hex private key");

export const env = createEnv({
	server: {
		FC_DEPLOYER_PRIVATE_KEY: privateKey,
		FC_SERVER_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
		FC_OWNER_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
		ALCHEMY_API_KEY: z.string().min(1),
		ETHERSCAN_API_KEY: z.string().min(1),
	},
	// Hardhat loads this file under Node/ts-node — not Bun.
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

export default env;
