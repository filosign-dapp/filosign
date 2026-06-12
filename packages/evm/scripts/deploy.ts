import "@nomicfoundation/hardhat-viem";
import { $ } from "bun";
import hre from "hardhat";
import { createWalletClient, getAddress, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import type { ChainKey } from "../definitions/chain-key.js";
import type { ContractName } from "../definitions/schema.js";
import env from "../env.js";
import {
	MAINNET_DEPLOY_CONFIRMED_ENV,
	requireMainnetDeployConfirmation,
} from "./lib/confirm-mainnet-deploy.js";
import {
	type DeployedContractBundle,
	persistDeployment,
} from "./lib/definitions/persist-deployment.js";
import { evmPackageDir } from "./lib/repo-paths.js";
import {
	deployAndFundLocalMockUsd,
	fundLocalMockUsdcRecipientForGas,
	fundLocalServer,
	LOCAL_MOCK_USDC_RECIPIENT,
	type LocalMockUsdBundle,
	viemChainOverride,
	writeMockUsdAddressFile,
} from "./local-dev.js";

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

type WalletDeployed = Awaited<ReturnType<typeof hre.viem.getWalletClient>>;

/** Alchemy free tier chokes on back-to-back sends from the same key. */
const LIVE_TX_PAUSE_MS = 2_000;

function isLiveChainId(chainId: number): boolean {
	return chainId === CHAIN_ID.testnet || chainId === CHAIN_ID.mainnet;
}

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

function abiFromContract(c: { address: string; abi: unknown }) {
	return { address: getAddress(c.address), abi: c.abi };
}

function liveNetworkRpcUrl(chainId: number): string {
	const key = env.ALCHEMY_API_KEY;
	if (chainId === CHAIN_ID.testnet) {
		return `https://base-sepolia.g.alchemy.com/v2/${key}`;
	}
	if (chainId === CHAIN_ID.mainnet) {
		return `https://base-mainnet.g.alchemy.com/v2/${key}`;
	}
	throw new Error(`No RPC URL for chainId ${chainId}`);
}

/**
 * Hardhat's address-only wallet client routes later txs through
 * `wallet_sendTransaction`, which Alchemy rejects. Local-account signing uses
 * `eth_sendRawTransaction` and matches what worked on the first deploy tx.
 */
async function getDeployerWallet(chainId: number): Promise<WalletDeployed> {
	const account = privateKeyToAccount(requireDeployerPrivateKey());

	if (!isLiveChainId(chainId)) {
		return hre.viem.getWalletClient(account.address, viemChainOverride());
	}

	const chain = chainId === CHAIN_ID.testnet ? baseSepolia : base;
	return createWalletClient({
		account,
		chain,
		transport: http(liveNetworkRpcUrl(chainId)),
	}) as WalletDeployed;
}

async function pauseBetweenLiveTxs(chainId: number) {
	if (isLiveChainId(chainId)) {
		await sleep(LIVE_TX_PAUSE_MS);
	}
}

async function deployEnvelopeRegistry(
	deployer: WalletDeployed,
	serverAddress: `0x${string}`,
	ownerAddress: `0x${string}` | null,
) {
	const envelopeRegistry = await hre.viem.deployContract(
		"FSEnvelopeRegistry",
		[serverAddress],
		{ client: { wallet: deployer } },
	);
	console.log("FSEnvelopeRegistry deployed at:", envelopeRegistry.address, {
		server: serverAddress,
		deployer: deployer.account.address,
	});

	if (ownerAddress) {
		try {
			const transferOwnership = envelopeRegistry.write.transferOwnership;
			if (!transferOwnership) {
				throw new Error("FSEnvelopeRegistry.transferOwnership unavailable");
			}
			const txHash = await transferOwnership([ownerAddress], {
				account: deployer.account,
				gas: 120_000n,
			});
			const publicClient = await hre.viem.getPublicClient(viemChainOverride());
			const receipt = await publicClient.waitForTransactionReceipt({
				hash: txHash,
			});
			if (receipt.status !== "success") {
				console.error("FSEnvelopeRegistry ownership transfer failed:", {
					pendingOwner: ownerAddress,
					txHash,
					status: receipt.status,
					note: "Continuing deployment without stopping.",
				});
			} else {
				const readPendingOwner = envelopeRegistry.read.pendingOwner;
				if (!readPendingOwner) {
					throw new Error("FSEnvelopeRegistry.pendingOwner unavailable");
				}
				const pendingOwner = await readPendingOwner();
				console.log("FSEnvelopeRegistry ownership transfer started:", {
					pendingOwner,
					txHash,
					note: "Pending owner must call acceptOwnership() from target wallet.",
				});
			}
		} catch (error) {
			console.error("FSEnvelopeRegistry ownership transfer failed:", {
				pendingOwner: ownerAddress,
				error: error instanceof Error ? error.message : String(error),
				note: "Continuing deployment without stopping.",
			});
		}
	}
	return envelopeRegistry;
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

async function deployAttachmentRelease(
	deployer: WalletDeployed,
	envelopeRegistryAddress: `0x${string}`,
	chainId: number,
) {
	const attachmentRelease = await hre.viem.deployContract(
		"FSAttachmentRelease",
		[envelopeRegistryAddress, BigInt(chainId)],
		{ client: { wallet: deployer } },
	);
	console.log("FSAttachmentRelease deployed at:", attachmentRelease.address);
	return attachmentRelease;
}

async function deployPaymentValidator(
	deployer: WalletDeployed,
	envelopeRegistryAddress: `0x${string}`,
	chainId: number,
) {
	const validator = await hre.viem.deployContract(
		"FSPaymentValidator",
		[envelopeRegistryAddress, BigInt(chainId)],
		{ client: { wallet: deployer } },
	);
	console.log("FSPaymentValidator deployed at:", validator.address);
	return validator;
}

function printDeploymentSummary(args: {
	chainKey: ChainKey;
	deploymentId: string;
	envelopeRegistryAddress: `0x${string}`;
	paymentValidatorAddress: `0x${string}`;
	attachmentReleaseAddress: `0x${string}`;
}) {
	console.log("\n--- Deployment summary ---");
	console.log(`  chain:        ${args.chainKey}`);
	console.log(`  deploymentId: ${args.deploymentId}`);
	console.log(`  registry:     ${args.envelopeRegistryAddress}`);
	console.log(`  validator:    ${args.paymentValidatorAddress}`);
	console.log(`  attachment:   ${args.attachmentReleaseAddress}`);
	console.log(
		"\nRebuild and redeploy server + client from this commit so bundled definitions match.",
	);
	if (args.chainKey === "testnet" || args.chainKey === "mainnet") {
		console.log(
			"Block explorer verify runs as a separate step after this script exits.",
		);
	}
}

export default async function main() {
	process.chdir(evmPackageDir());

	const chainId = requireChainId();
	if (
		chainId === CHAIN_ID.mainnet &&
		process.env[MAINNET_DEPLOY_CONFIRMED_ENV] !== "1"
	) {
		await requireMainnetDeployConfirmation(chainId);
	}

	const deployer = await getDeployerWallet(chainId);
	const serverAddress = resolveServerAddress();
	const ownerAddress = resolveOwnerAddress(deployer.account.address);

	console.log("Deploying contracts as", {
		deployer: deployer.account.address,
		server: serverAddress,
		owner: ownerAddress ?? deployer.account.address,
	});

	const envelopeRegistry = await deployEnvelopeRegistry(
		deployer,
		serverAddress,
		ownerAddress,
	);
	const publicClient = await assertBytecodeLive(envelopeRegistry.address);
	await pauseBetweenLiveTxs(chainId);
	const paymentValidator = await deployPaymentValidator(
		deployer,
		envelopeRegistry.address,
		chainId,
	);
	await pauseBetweenLiveTxs(chainId);
	const attachmentRelease = await deployAttachmentRelease(
		deployer,
		envelopeRegistry.address,
		chainId,
	);
	await pauseBetweenLiveTxs(chainId);

	const setSatelliteContracts = envelopeRegistry.write.setSatelliteContracts;
	if (!setSatelliteContracts) {
		throw new Error("FSEnvelopeRegistry.setSatelliteContracts unavailable");
	}
	const setSatellitesTx = await setSatelliteContracts(
		[paymentValidator.address, attachmentRelease.address],
		{ account: deployer.account },
	);
	const setSatellitesReceipt = await publicClient.waitForTransactionReceipt({
		hash: setSatellitesTx,
	});
	if (setSatellitesReceipt.status !== "success") {
		console.error("setSatelliteContracts failed:", setSatellitesTx);
		process.exit(1);
	}
	console.log("Satellite contracts configured on FSEnvelopeRegistry:", {
		paymentValidator: paymentValidator.address,
		attachmentRelease: attachmentRelease.address,
		txHash: setSatellitesTx,
	});

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

	const chainKey = chainKeyFromId(chainId);

	const bundles: DeployedContractBundle[] = [
		{
			name: "FSEnvelopeRegistry" satisfies ContractName,
			...abiFromContract(envelopeRegistry),
		},
		{
			name: "FSPaymentValidator" satisfies ContractName,
			...abiFromContract(paymentValidator),
		},
		{
			name: "FSAttachmentRelease" satisfies ContractName,
			...abiFromContract(attachmentRelease),
		},
		...(chainId === CHAIN_ID.local && mockUsd
			? [
					{
						name: "MockUSDC",
						address: mockUsd.address,
						abi: mockUsd.abi,
					} satisfies DeployedContractBundle,
				]
			: []),
	];

	const { deploymentId } = await persistDeployment({
		chainKey,
		chainId,
		contracts: bundles,
		transactions: { setSatelliteContracts: setSatellitesTx },
	});
	console.log(`Deployment persisted: ${deploymentId}`);

	const evmDir = evmPackageDir();
	await $`bun run --cwd ${evmDir} gen:definitions`;
	await $`bun run --cwd ${evmDir} export:public`;

	printDeploymentSummary({
		chainKey,
		deploymentId,
		envelopeRegistryAddress: envelopeRegistry.address,
		paymentValidatorAddress: paymentValidator.address,
		attachmentReleaseAddress: attachmentRelease.address,
	});
}
