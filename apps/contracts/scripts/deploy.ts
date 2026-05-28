import { $ } from "bun";
import hre from "hardhat";
import { getAddress, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ChainKey } from "../definitions/index.js";
import env from "../env";
import {
	deployAndFundLocalMockUsd,
	fundLocalMockUsdcRecipientForGas,
	fundLocalServer,
	LOCAL_MOCK_USDC_RECIPIENT,
	type LocalMockUsdBundle,
	viemChainOverride,
	writeMockUsdAddressFile,
} from "./local-dev";

const DEFINITIONS_FILE_PREFIX = "export const definitions = ";
const DEFINITIONS_FILE_SUFFIX = " as const;";

const CHAIN_ID = {
	local: 31337,
	testnet: 84532,
	mainnet: 8453,
} as const;

const CHAIN_NUMBER_TO_KEY: Record<number, ChainKey> = {
	[CHAIN_ID.local]: "local",
	[CHAIN_ID.testnet]: "testnet",
	[CHAIN_ID.mainnet]: "mainnet",
};

const BASE_BLOCK_EXPLORER_NETWORKS = new Set(["baseSepolia", "base"]);

type WalletDeployed = Awaited<ReturnType<typeof hre.viem.getWalletClient>>;

function chainKeyFromId(chainId: number): ChainKey {
	const key = CHAIN_NUMBER_TO_KEY[chainId];
	if (!key) throw new Error(`Unsupported chainId ${chainId}`);
	return key;
}

function sleep(ms: number) {
	return Bun.sleep(ms);
}

function requireChainId(): number {
	const chainId = hre.network.config.chainId;
	if (!chainId) {
		console.error("No chainId in network config");
		process.exit(1);
	}
	return chainId;
}

function requireDeployerPrivateKey(): `0x${string}` {
	return env.FC_DEPLOYER_PRIVATE_KEY as `0x${string}`;
}

function resolveServerAddress(): `0x${string}` {
	return getAddress(env.FC_SERVER_ADDRESS) as `0x${string}`;
}

function resolveOwnerAddress(
	deployerAddress: `0x${string}`,
): `0x${string}` | null {
	const raw = env.FC_OWNER_ADDRESS;
	const owner = getAddress(raw);
	if (owner === deployerAddress) return null;
	return owner;
}

function definitionsFileBody(singleChainDefinitions: unknown) {
	return (
		DEFINITIONS_FILE_PREFIX +
		JSON.stringify(singleChainDefinitions, null, 2) +
		DEFINITIONS_FILE_SUFFIX
	);
}

function abiFromContract(c: { address: string; abi: unknown }) {
	return { address: getAddress(c.address), abi: c.abi };
}

async function deployFileRegistry(
	deployer: WalletDeployed,
	serverAddress: `0x${string}`,
	ownerAddress: `0x${string}` | null,
) {
	const fileRegistry = await hre.viem.deployContract(
		"FSFileRegistry",
		[serverAddress],
		{ client: { wallet: deployer } },
	);
	console.log("FSFileRegistry deployed at:", fileRegistry.address, {
		server: serverAddress,
		deployer: deployer.account.address,
	});

	if (ownerAddress) {
		try {
			const txHash = await fileRegistry.write.transferOwnership(
				[ownerAddress],
				{
					account: deployer.account,
					gas: 120_000n,
				},
			);
			const publicClient = await hre.viem.getPublicClient(viemChainOverride());
			const receipt = await publicClient.waitForTransactionReceipt({
				hash: txHash,
			});
			if (receipt.status !== "success") {
				console.error("FSFileRegistry ownership transfer failed:", {
					pendingOwner: ownerAddress,
					txHash,
					status: receipt.status,
					note: "Continuing deployment without stopping.",
				});
			} else {
				const pendingOwner = await fileRegistry.read.pendingOwner();
				console.log("FSFileRegistry ownership transfer started:", {
					pendingOwner,
					txHash,
					note: "Pending owner must call acceptOwnership() from target wallet.",
				});
			}
		} catch (error) {
			console.error("FSFileRegistry ownership transfer failed:", {
				pendingOwner: ownerAddress,
				error: error instanceof Error ? error.message : String(error),
				note: "Continuing deployment without stopping.",
			});
		}
	}
	return fileRegistry;
}

async function assertBytecodeLive(address: `0x${string}`) {
	await sleep(3000);
	const publicClient = await hre.viem.getPublicClient(viemChainOverride());
	const code = await publicClient.getCode({ address });
	if (!code || code === "0x") {
		console.error("Deployment failed - no code at", address);
		process.exit(1);
	}
	return publicClient;
}

async function deployPaymentValidator(
	deployer: WalletDeployed,
	fileRegistryAddress: `0x${string}`,
	chainId: number,
) {
	const validator = await hre.viem.deployContract(
		"FSPaymentValidator",
		[fileRegistryAddress, BigInt(chainId)],
		{ client: { wallet: deployer } },
	);
	console.log("FSPaymentValidator deployed at:", validator.address);
	return validator;
}

async function verifyOnBaseExplorerIfApplicable(args: {
	networkName: string;
	fileRegistry: Awaited<ReturnType<typeof deployFileRegistry>>;
	paymentValidator: Awaited<ReturnType<typeof deployPaymentValidator>>;
	serverAddress: `0x${string}`;
	fileRegistryAddress: `0x${string}`;
	chainId: number;
}) {
	const { networkName, fileRegistry, paymentValidator, serverAddress } = args;
	if (!BASE_BLOCK_EXPLORER_NETWORKS.has(networkName)) return;

	try {
		await $`bunx --bun hardhat verify --network ${networkName} ${fileRegistry.address} ${serverAddress} --force`;
		await sleep(1000);
		await $`bunx --bun hardhat verify --network ${networkName} ${paymentValidator.address} ${args.fileRegistryAddress} ${String(args.chainId)} --force`;
	} catch (_) {}
	console.log(`Contracts verified on ${networkName} block explorer`);
}

async function main() {
	const chainId = requireChainId();
	const deployer = await hre.viem.getWalletClient(
		privateKeyToAccount(requireDeployerPrivateKey()).address,
		viemChainOverride(),
	);
	const serverAddress = resolveServerAddress();
	const ownerAddress = resolveOwnerAddress(deployer.account.address);

	console.log("Deploying contracts as", {
		deployer: deployer.account.address,
		server: serverAddress,
		owner: ownerAddress ?? deployer.account.address,
	});

	const fileRegistry = await deployFileRegistry(
		deployer,
		serverAddress,
		ownerAddress,
	);
	const publicClient = await assertBytecodeLive(fileRegistry.address);
	const paymentValidator = await deployPaymentValidator(
		deployer,
		fileRegistry.address,
		chainId,
	);

	let mockUsd: LocalMockUsdBundle | undefined;
	if (chainId === CHAIN_ID.local) {
		await fundLocalServer(deployer, publicClient, serverAddress);
		await fundLocalMockUsdcRecipientForGas(
			deployer,
			publicClient,
			LOCAL_MOCK_USDC_RECIPIENT,
		);
		mockUsd = await deployAndFundLocalMockUsd(deployer, publicClient);
		await writeMockUsdAddressFile(mockUsd.address);
	}

	const definitions = {
		FSFileRegistry: abiFromContract(fileRegistry),
		FSPaymentValidator: abiFromContract(paymentValidator),
		...(chainId === CHAIN_ID.local && mockUsd ? { MockUSDC: mockUsd } : {}),
	} as const;

	const path = `definitions/${chainKeyFromId(chainId)}.ts`;
	await Bun.write(path, definitionsFileBody({ [toHex(chainId)]: definitions }));
	console.log(`Definitions written to ${path}`);

	await verifyOnBaseExplorerIfApplicable({
		networkName: hre.network.name,
		fileRegistry,
		paymentValidator,
		serverAddress,
		fileRegistryAddress: fileRegistry.address,
		chainId,
	});
}

main()
	.then(() => console.log("Deployment script finished"))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
