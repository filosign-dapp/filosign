import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const privateKey = z
	.string()
	.regex(/^0x[0-9a-fA-F]{64}$/, "Expected a 32-byte hex private key");

const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

export const env = createEnv({
	server: {
		FC_DEPLOYER_PRIVATE_KEY: privateKey,
		/** Comma-separated relayer addresses for FSEnvelopeRegistry initialRelayers. */
		RELAYER_POOL: z.string().min(1),
		FC_OWNER_ADDRESS: evmAddress.optional(),
		ALCHEMY_API_KEY: z.string().min(1).optional(),
		ETHERSCAN_API_KEY: z.string().min(1).optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

export default env;
