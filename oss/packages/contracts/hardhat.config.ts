import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

function liveNetworks(): HardhatUserConfig["networks"] {
	const deployerKey = process.env.FC_DEPLOYER_PRIVATE_KEY;
	const alchemyKey = process.env.ALCHEMY_API_KEY;
	if (!deployerKey || !alchemyKey) {
		return {};
	}

	return {
		baseSepolia: {
			accounts: [deployerKey],
			chainId: 84532,
			url: `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`,
		},
		base: {
			accounts: [deployerKey],
			chainId: 8453,
			url: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
		},
	};
}

const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.26",
		settings: {
			optimizer: {
				enabled: true,
				runs: 400,
			},
			viaIR: true,
			evmVersion: "cancun",
			outputSelection: {
				"*": {
					"*": [
						"abi",
						"evm.bytecode",
						"evm.deployedBytecode",
						"evm.methodIdentifiers",
						"metadata",
						"storageLayout",
					],
				},
			},
		},
	},
	sourcify: { enabled: false },
	paths: {
		sources: "./src",
	},
	networks: {
		hardhat: {
			allowUnlimitedContractSize: true,
		},
		localhost: {
			url: "http://127.0.0.1:8545",
			chainId: 31337,
		},
		...liveNetworks(),
	},
	...(etherscanApiKey
		? {
				etherscan: {
					apiKey: etherscanApiKey,
					customChains: [
						{
							network: "baseSepolia",
							chainId: 84532,
							urls: {
								apiURL: "https://api-sepolia.basescan.org/api",
								browserURL: "https://sepolia.basescan.org",
							},
						},
						{
							network: "base",
							chainId: 8453,
							urls: {
								apiURL: "https://api.basescan.org/api",
								browserURL: "https://basescan.org",
							},
						},
					],
				},
			}
		: {}),
};

export default config;
