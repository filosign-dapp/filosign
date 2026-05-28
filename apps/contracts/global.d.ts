declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FC_DEPLOYER_PRIVATE_KEY: `0x${string}`;
			FC_SERVER_ADDRESS: `0x${string}`;
			FC_OWNER_ADDRESS: `0x${string}`;
			ALCHEMY_API_KEY: string;
			ETHERSCAN_API_KEY: string;
		}
	}
}

export {};
