import hre from "hardhat";
import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	signRegisterFile,
	signRegisterFileSignature,
	signRegisterKeygen,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

export type FullSystemFixture = {
	fileRegistry: Awaited<
		ReturnType<typeof hre.viem.getContractAt<"FSFileRegistry">>
	>;
	mockUsdc: Awaited<
		ReturnType<typeof hre.viem.deployContract<"MockUSDCToken">>
	>;
	paymentValidator: Awaited<
		ReturnType<typeof hre.viem.deployContract<"FSPaymentValidator">>
	>;
	deployer: WalletClient;
	server: WalletClient;
	sender: WalletClient;
	payout: WalletClient;
	coSigner: WalletClient;
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

async function deployCore(args: {
	deployer: WalletClient;
	server: WalletClient;
	sender: WalletClient;
	payout: WalletClient;
	coSigner: WalletClient;
	registerSenderKeygen: boolean;
}): Promise<FullSystemFixture> {
	const { deployer, server, sender, payout, registerSenderKeygen } = args;
	const publicClient = await hre.viem.getPublicClient();
	const chainId = await publicClient.getChainId();

	const fileRegistry = await hre.viem.deployContract(
		"FSFileRegistry",
		[walletAccount(server).address],
		{ client: { wallet: deployer } },
	);

	const mockUsdc = await hre.viem.deployContract("MockUSDCToken", [
		walletAccount(deployer).address,
	]);

	const paymentValidator = await hre.viem.deployContract(
		"FSPaymentValidator",
		[fileRegistry.address, BigInt(chainId)],
		{ client: { wallet: deployer } },
	);

	if (registerSenderKeygen) {
		const keySig = await signRegisterKeygen(
			sender,
			fileRegistry.address,
			chainId,
		);
		void keySig;
	}

	return {
		fileRegistry,
		mockUsdc,
		paymentValidator,
		deployer,
		server,
		sender,
		payout,
		coSigner: args.coSigner,
		publicClient,
		chainId,
	};
}

export async function deployFullSystem(): Promise<FullSystemFixture> {
	const clients = await hre.viem.getWalletClients();
	const deployer = clients[0];
	const server = clients[1];
	const coSigner = clients[2];
	const sender = clients[3];
	const payout = clients[4];
	if (!deployer || !server || !coSigner || !sender || !payout) {
		throw new Error("expected Hardhat wallet clients");
	}

	return deployCore({
		deployer,
		server,
		sender,
		payout,
		coSigner,
		registerSenderKeygen: false,
	});
}

// Legacy helper name used by ERC1271 tests — keygen is off-chain; no-op on chain.
export async function registerKeygenForWallet(
	_ctx: FullSystemFixture,
	_walletAddress: Address,
	_signature?: Hex,
): Promise<void> {}

export async function deployFullSystemWithoutSenderKeygen(): Promise<FullSystemFixture> {
	return deployFullSystem();
}

const defaultPlacement = `0x${"ab".repeat(32)}` as Hex;
const defaultSenderEmail = `0x${"cd".repeat(32)}` as Hex;
const defaultSenderPrivy = `0x${"ef".repeat(32)}` as Hex;

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
