declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FC_PVT_KEY: `0x${string}`;
			FC_SERVER_ADDRESS?: `0x${string}`;
		}
	}
}

export {};
