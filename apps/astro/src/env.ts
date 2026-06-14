import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "PUBLIC_",
	client: {
		PUBLIC_ASTRO_URL: z.url().default("https://filosign.xyz"),
		PUBLIC_CLIENT_URL: z.url().default("http://localhost:3001"),
		PUBLIC_SERVER_URL: z.url().default("http://localhost:3000"),
	},
	runtimeEnv: {
		PUBLIC_ASTRO_URL: import.meta.env.PUBLIC_ASTRO_URL,
		PUBLIC_CLIENT_URL: import.meta.env.PUBLIC_CLIENT_URL,
		PUBLIC_SERVER_URL: import.meta.env.PUBLIC_SERVER_URL,
	},
});
