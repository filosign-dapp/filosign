import hre from "hardhat";
import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	COMMIT_DILITHIUM,
	COMMIT_KYBER,
	SALT_CHALLENGE,
	SALT_PIN,
	SALT_SEED,
	signRegisterFile,
	signRegisterFileSignature,
	signRegisterKeygen,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

export type FullSystemFixture = {
	manager: Awaited<ReturnType<typeof hre.viem.deployContract<"FSManager">>>;
	fileRegistry: Awaited<
		ReturnType<typeof hre.viem.getContractAt<"FSFileRegistry">>
	>;
	keyRegistry: Awaited<
		ReturnType<typeof hre.viem.getContractAt<"FSKeyRegistry">>
	>;
	mockUsdc: Awaited<
		ReturnType<typeof hre.viem.deployContract<"MockUSDCToken">>
	>;
	server: WalletClient;
	treasury: WalletClient;
	sender: WalletClient;
	payout: WalletClient;
	publicClient: PublicClient;
	chainId: number;
};

/** Stand-in for Safe / ERC-1271 contract wallets in signature tests. */
export async function deployMock1271(valid: boolean): Promise<Address> {
	const mock = await hre.viem.deployContract("MockERC1271Signer", [valid]);
	return mock.address;
}

export async function setMock1271Valid(
	address: Address,
	valid: boolean,
): Promise<void> {
	const mock = await hre.viem.getContractAt("MockERC1271Signer", address);
	await mock.write.setValid([valid]);
}

/** Register keygen row for any wallet (EOA or contract). */
export async function registerKeygenForWallet(
	ctx: FullSystemFixture,
	walletAddress: Address,
	signature: Hex = "0x1234",
): Promise<void> {
	await ctx.keyRegistry.write.registerKeygenData(
		[
			SALT_PIN,
			SALT_SEED,
			SALT_CHALLENGE,
			COMMIT_KYBER,
			COMMIT_DILITHIUM,
			signature,
			walletAddress,
		],
		{ account: walletAccount(ctx.server) },
	);
}

export async function deployFullSystem(): Promise<FullSystemFixture> {
	const [server, treasury, sender, payout] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();
	const chainId = await publicClient.getChainId();

	const manager = await hre.viem.deployContract(
		"FSManager",
		[walletAccount(treasury).address],
		{ client: { wallet: server } },
	);
	const fileRegistry = await hre.viem.getContractAt(
		"FSFileRegistry",
		await manager.read.fileRegistry(),
	);
	const keyRegistry = await hre.viem.getContractAt(
		"FSKeyRegistry",
		await manager.read.keyRegistry(),
	);

	const mockUsdc = await hre.viem.deployContract("MockUSDCToken", [
		walletAccount(server).address,
	]);

	const keySig = await signRegisterKeygen(sender, keyRegistry.address, chainId);
	await keyRegistry.write.registerKeygenData(
		[
			SALT_PIN,
			SALT_SEED,
			SALT_CHALLENGE,
			COMMIT_KYBER,
			COMMIT_DILITHIUM,
			keySig,
			walletAccount(sender).address,
		],
		{ account: walletAccount(server) },
	);

	return {
		manager,
		fileRegistry,
		keyRegistry,
		mockUsdc,
		server,
		treasury,
		sender,
		payout,
		publicClient,
		chainId,
	};
}

/** Manager + registry + token; **no** `FSKeyRegistry` row for `sender` (for negative registration tests). */
export async function deployFullSystemWithoutSenderKeygen(): Promise<FullSystemFixture> {
	const [server, treasury, sender, payout] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();
	const chainId = await publicClient.getChainId();

	const manager = await hre.viem.deployContract(
		"FSManager",
		[walletAccount(treasury).address],
		{ client: { wallet: server } },
	);
	const fileRegistry = await hre.viem.getContractAt(
		"FSFileRegistry",
		await manager.read.fileRegistry(),
	);
	const keyRegistry = await hre.viem.getContractAt(
		"FSKeyRegistry",
		await manager.read.keyRegistry(),
	);

	const mockUsdc = await hre.viem.deployContract("MockUSDCToken", [
		walletAccount(server).address,
	]);

	return {
		manager,
		fileRegistry,
		keyRegistry,
		mockUsdc,
		server,
		treasury,
		sender,
		payout,
		publicClient,
		chainId,
	};
}

const defaultPlacement = `0x${"ab".repeat(32)}` as Hex;
const defaultSenderEmail = `0x${"cd".repeat(32)}` as Hex;
const defaultSenderPrivy = `0x${"ef".repeat(32)}` as Hex;

/** Register file row for one or more signer commitments. */
export async function registerFileOnly(
	ctx: FullSystemFixture,
	pieceCid: string,
	signerCommitments: Hex[],
): Promise<void> {
	const { fileRegistry, server, sender, chainId, publicClient } = ctx;
	const timestamp = await latestBlockTimestamp(publicClient);
	const nonce = await fileRegistry.read.nonce([walletAccount(sender).address]);
	const signersCommitment =
		await fileRegistry.read.computeEmailSignerCommitment([signerCommitments]);

	const regSig = await signRegisterFile({
		wallet: sender,
		fileRegistryAddress: fileRegistry.address,
		chainId,
		pieceCid,
		signersCommitment,
		placementCommitment: defaultPlacement,
		senderEmailCommitment: defaultSenderEmail,
		senderPrivySubjectCommitment: defaultSenderPrivy,
		timestamp,
		nonce,
	});

	const zeroOrg =
		"0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

	await fileRegistry.write.registerFile(
		[
			pieceCid,
			walletAccount(sender).address,
			signerCommitments,
			[],
			defaultSenderEmail,
			defaultSenderPrivy,
			zeroOrg,
			timestamp,
			regSig,
			defaultPlacement,
		],
		{ account: walletAccount(server) },
	);
}

const signDefaults = {
	privy: `0x${"99".repeat(32)}` as Hex,
	dl3: `0x${"88".repeat(20)}` as Hex,
	root: `0x${"77".repeat(32)}` as Hex,
	leafVersion: 1,
};

/** One `registerFileSignature` call (not necessarily the last signer). */
export async function registerFileSignatureStep(args: {
	ctx: FullSystemFixture;
	pieceCid: string;
	senderAddr: `0x${string}`;
	signerWallet: WalletClient;
	signerEmailCommitment: Hex;
}): Promise<void> {
	const { ctx, pieceCid, senderAddr, signerWallet, signerEmailCommitment } =
		args;
	const signTs = await latestBlockTimestamp(ctx.publicClient);
	const signNonce = await ctx.fileRegistry.read.nonce([
		walletAccount(signerWallet).address,
	]);
	const signSig = await signRegisterFileSignature({
		wallet: signerWallet,
		fileRegistryAddress: ctx.fileRegistry.address,
		chainId: ctx.chainId,
		pieceCid,
		sender: senderAddr,
		signerEmailCommitment,
		privySubjectCommitment: signDefaults.privy,
		dl3SignatureCommitment: signDefaults.dl3,
		completionsRoot: signDefaults.root,
		leafSchemaVersion: signDefaults.leafVersion,
		timestamp: signTs,
		nonce: signNonce,
	});
	await ctx.fileRegistry.write.registerFileSignature(
		[
			pieceCid,
			senderAddr,
			walletAccount(signerWallet).address,
			signerEmailCommitment,
			signDefaults.privy,
			signDefaults.dl3,
			signTs,
			signSig,
			signDefaults.root,
			signDefaults.leafVersion,
		],
		{ account: walletAccount(ctx.server) },
	);
}
