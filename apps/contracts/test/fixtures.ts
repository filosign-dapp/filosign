import hre from "hardhat";
import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	mergeSortedCommitments,
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

export const defaultPlacement = `0x${"ab".repeat(32)}` as Hex;
export const defaultSenderEmail = `0x${"cd".repeat(32)}` as Hex;
export const defaultSenderPrivy = `0x${"ef".repeat(32)}` as Hex;
export const zeroOrg =
	"0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

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

export async function registerKeygenForWallet(
	_ctx: FullSystemFixture,
	_walletAddress: Address,
	_signature?: Hex,
): Promise<void> {}

export async function deployFullSystemWithoutSenderKeygen(): Promise<FullSystemFixture> {
	return deployFullSystem();
}

export type RegisterFileOptions = {
	pieceCid: string;
	requiredCommitments: Hex[];
	optionalCommitments?: Hex[];
	viewerEmailCommitments?: Hex[];
	sender?: WalletClient | Address;
	routingMode?: number;
	routingOrder?: Hex[];
	quorumN?: number;
	quorumSet?: Hex[];
	signature?: Hex;
	placementCommitment?: Hex;
	senderEmailCommitment?: Hex;
	senderPrivySubjectCommitment?: Hex;
	orgIdCommitment?: Hex;
};

export async function buildRegisterFileInput(
	ctx: FullSystemFixture,
	options: RegisterFileOptions,
) {
	const senderWallet =
		typeof options.sender === "string" || options.sender === undefined
			? ctx.sender
			: options.sender;
	const senderAddress =
		typeof options.sender === "string"
			? options.sender
			: walletAccount(senderWallet).address;
	const optionalCommitments = options.optionalCommitments ?? [];
	const viewerEmailCommitments = options.viewerEmailCommitments ?? [];
	const routingMode = options.routingMode ?? 0;
	const routingOrder = options.routingOrder ?? [];
	const quorumN = options.quorumN ?? 0;
	const quorumSet = options.quorumSet ?? [];
	const timestamp = await latestBlockTimestamp(ctx.publicClient);
	const nonce = await ctx.fileRegistry.read.nonce([senderAddress]);
	const merged = mergeSortedCommitments(
		options.requiredCommitments,
		optionalCommitments,
	);
	const signersCommitment =
		await ctx.fileRegistry.read.computeEmailSignerCommitment([merged]);
	const viewersCommitment =
		viewerEmailCommitments.length === 0
			? ("0x0000000000000000000000000000000000000000" as Hex)
			: await ctx.fileRegistry.read.computeEmailSignerCommitment([
					viewerEmailCommitments,
				]);

	const signature =
		options.signature ??
		(typeof options.sender === "string"
			? (() => {
					throw new Error(
						"registerFile with contract sender requires an explicit signature",
					);
				})()
			: await signRegisterFile({
					wallet: senderWallet,
					fileRegistryAddress: ctx.fileRegistry.address,
					chainId: ctx.chainId,
					pieceCid: options.pieceCid,
					requiredCommitments: options.requiredCommitments,
					optionalCommitments,
					signersCommitment,
					viewersCommitment,
					placementCommitment: options.placementCommitment ?? defaultPlacement,
					senderEmailCommitment:
						options.senderEmailCommitment ?? defaultSenderEmail,
					senderPrivySubjectCommitment:
						options.senderPrivySubjectCommitment ?? defaultSenderPrivy,
					orgIdCommitment: options.orgIdCommitment ?? zeroOrg,
					routingMode,
					routingOrder,
					quorumN,
					quorumSet,
					timestamp,
					nonce,
				}));

	if (!signature) {
		throw new Error("registerFile requires a signature");
	}

	return {
		pieceCid: options.pieceCid,
		sender: senderAddress,
		requiredCommitments: options.requiredCommitments,
		optionalCommitments,
		viewerEmailCommitments,
		senderEmailCommitment: options.senderEmailCommitment ?? defaultSenderEmail,
		senderPrivySubjectCommitment:
			options.senderPrivySubjectCommitment ?? defaultSenderPrivy,
		orgIdCommitment: options.orgIdCommitment ?? zeroOrg,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
		timestamp,
		signature,
		placementCommitment: options.placementCommitment ?? defaultPlacement,
	};
}

export async function registerFileOnly(
	ctx: FullSystemFixture,
	pieceCid: string,
	signerCommitments: Hex[],
	options: Omit<RegisterFileOptions, "pieceCid" | "requiredCommitments"> = {},
): Promise<void> {
	const input = await buildRegisterFileInput(ctx, {
		pieceCid,
		requiredCommitments: signerCommitments,
		...options,
	});
	await ctx.fileRegistry.write.registerFile([input], {
		account: walletAccount(ctx.server),
	});
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

export type PaymentRuleOptions = {
	payer: Address;
	token: Address;
	cidId: Hex;
	releaseType: number;
	specificSignerCommitment?: Hex;
	thresholdN?: number;
	expiresAt?: bigint;
	signerCommitments?: Hex[];
	legs: { recipient: Address; amount: bigint }[];
};

export async function registerPaymentRule(
	ctx: FullSystemFixture,
	options: PaymentRuleOptions,
): Promise<bigint> {
	await ctx.paymentValidator.write.registerRule(
		[
			options.payer,
			options.token,
			options.cidId,
			options.releaseType,
			options.specificSignerCommitment ?? (`0x${"00".repeat(32)}` as Hex),
			options.thresholdN ?? 0,
			options.expiresAt ?? 0n,
			options.signerCommitments ?? [],
			options.legs,
		],
		{ account: options.payer },
	);
	return (await ctx.paymentValidator.read.nextRuleId()) - 1n;
}
