import { $ } from "bun";
import hre from "hardhat";
import { type Chain, getAddress, parseEther, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import type { ChainKey } from "../definitions/index.js";

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
const LOCAL_MOCK_USDC_RECIPIENT = getAddress(
	"0x4CC33004581cdDe1a4838C9d897260A244f3b4dA",
);
const LOCAL_MOCK_USDC_MINT_AMOUNT = 10_000_000n * 10n ** 6n;
const MOCK_USDC_DEF_PATH = "definitions/mock-usdc.ts";

const HARDHAT_LOCAL_SERVER = getAddress(
	"0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
);

type MockUsdBundle = {
	readonly address: `0x${string}`;
	abi: unknown;
};

type WalletDeployed = Awaited<ReturnType<typeof hre.viem.getWalletClient>>;
type PublicClientDeployed = Awaited<
	ReturnType<typeof hre.viem.getPublicClient>
>;

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
	const key = process.env.FC_PVT_KEY as `0x${string}` | undefined;
	if (!key) {
		console.error("FC_PVT_KEY is required for deployment");
		process.exit(1);
	}
	return key;
}

function resolveServerAddress(chainId: number): `0x${string}` {
	const raw = process.env.FC_SERVER_ADDRESS;
	if (raw) return getAddress(raw);
	if (chainId === CHAIN_ID.local) {
		console.warn(
			"FC_SERVER_ADDRESS not set — using Hardhat account #1 for local server",
		);
		return HARDHAT_LOCAL_SERVER;
	}
	console.error("FC_SERVER_ADDRESS is required for deployment");
	process.exit(1);
}

async function fundLocalServer(
	deployer: WalletDeployed,
	publicClient: PublicClientDeployed,
	serverAddress: `0x${string}`,
) {
	const min = parseEther("1");
	const balance = await publicClient.getBalance({ address: serverAddress });
	if (balance >= min) return;

	const hash = await deployer.sendTransaction({
		account: deployer.account,
		to: serverAddress,
		value: parseEther("100"),
	});
	await publicClient.waitForTransactionReceipt({ hash });
	console.log("Funded server relayer:", serverAddress);
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

function viemChainOverride(): { chain: Chain } | undefined {
	if (hre.network.name === "localhost") {
		return { chain: hardhat };
	}
	return undefined;
}

async function deployFileRegistry(
	deployer: WalletDeployed,
	serverAddress: `0x${string}`,
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

async function deployAndFundLocalMockUsd(
	deployer: WalletDeployed,
	publicClient: PublicClientDeployed,
): Promise<MockUsdBundle> {
	const mockUsdc = await hre.viem.deployContract(
		"MockUSDCToken",
		[deployer.account.address],
		{ client: { wallet: deployer } },
	);
	const bundle: MockUsdBundle = {
		address: getAddress(mockUsdc.address),
		abi: mockUsdc.abi,
	};
	const mintHash = await mockUsdc.write.mint([
		LOCAL_MOCK_USDC_RECIPIENT,
		LOCAL_MOCK_USDC_MINT_AMOUNT,
	]);
	await publicClient.waitForTransactionReceipt({ hash: mintHash });
	return bundle;
}

async function writeMockUsdAddressFile(address: `0x${string}`) {
	const body =
		"/** Auto-generated by scripts/deploy.ts (local Hardhat) — do not edit */\n" +
		`export const LOCAL_MOCK_USDC_ADDRESS = ${JSON.stringify(address)} as const;\n`;
	await Bun.write(MOCK_USDC_DEF_PATH, body);
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
	const serverAddress = resolveServerAddress(chainId);

	console.log("Deploying contracts as", {
		deployer: deployer.account.address,
		server: serverAddress,
	});

	const fileRegistry = await deployFileRegistry(deployer, serverAddress);
	const publicClient = await assertBytecodeLive(fileRegistry.address);
	const paymentValidator = await deployPaymentValidator(
		deployer,
		fileRegistry.address,
		chainId,
	);

	let mockUsd: MockUsdBundle | undefined;
	if (chainId === CHAIN_ID.local) {
		await fundLocalServer(deployer, publicClient, serverAddress);
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
