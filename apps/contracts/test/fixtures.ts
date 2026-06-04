import hre from "hardhat";
import type { Account, Address, Hex, PublicClient, WalletClient } from "viem";
import { keccak256, toBytes } from "viem";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	signRegisterEnvelope,
	signRegisterEnvelopeSignature,
	signRegisterKeygen,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

export type FullSystemFixture = {
	envelopeRegistry: Awaited<
		ReturnType<typeof hre.viem.getContractAt<"FSEnvelopeRegistry">>
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
/** Non-zero register document hash for tests (distinct from placement). */
export const defaultDocumentSha256 = `0x${"12".repeat(32)}` as Hex;
export const defaultSenderEmail = `0x${"cd".repeat(32)}` as Hex;
export const defaultSenderAuth = `0x${"ef".repeat(32)}` as Hex;
export const zeroOrg =
	"0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

/** Stable org id commitment for multi-controller tests. */
export const testOrgIdCommitment = keccak256(
	toBytes("filosign-test-org"),
) as Hex;

export async function setOrgControllersForTest(
	ctx: FullSystemFixture,
	orgIdCommitment: Hex,
	controllers: Address[],
) {
	await ctx.envelopeRegistry.write.setOrgControllers(
		[orgIdCommitment, controllers],
		{ account: walletAccount(ctx.server) as Account },
	);
}

export async function deployAttachmentRelease(ctx: FullSystemFixture) {
	return hre.viem.deployContract(
		"FSAttachmentRelease",
		[ctx.envelopeRegistry.address, BigInt(ctx.chainId)],
		{ client: { wallet: ctx.deployer } },
	);
}

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

	const envelopeRegistry = await hre.viem.deployContract(
		"FSEnvelopeRegistry",
		[walletAccount(server).address],
		{ client: { wallet: deployer } },
	);

	const mockUsdc = await hre.viem.deployContract("MockUSDCToken", [
		walletAccount(deployer).address,
	]);

	const paymentValidator = await hre.viem.deployContract(
		"FSPaymentValidator",
		[envelopeRegistry.address, BigInt(chainId)],
		{ client: { wallet: deployer } },
	);

	if (registerSenderKeygen) {
		const keySig = await signRegisterKeygen(
			sender,
			envelopeRegistry.address,
			chainId,
		);
		void keySig;
	}

	return {
		envelopeRegistry,
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

export type RegisterEnvelopeOptions = {
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
	documentSha256?: Hex;
	senderEmailCommitment?: Hex;
	senderAuthSubjectCommitment?: Hex;
	orgIdCommitment?: Hex;
};

export async function buildRegisterEnvelopeInput(
	ctx: FullSystemFixture,
	options: RegisterEnvelopeOptions,
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
	const signersCommitment =
		await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
			options.requiredCommitments,
		]);
	const viewersCommitment =
		viewerEmailCommitments.length === 0
			? ("0x0000000000000000000000000000000000000000" as Hex)
			: await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
					viewerEmailCommitments,
				]);

	const signature =
		options.signature ??
		(typeof options.sender === "string"
			? (() => {
					throw new Error(
						"registerEnvelope with contract sender requires an explicit signature",
					);
				})()
			: await signRegisterEnvelope({
					wallet: senderWallet,
					envelopeRegistryAddress: ctx.envelopeRegistry.address,
					chainId: ctx.chainId,
					pieceCid: options.pieceCid,
					requiredCommitments: options.requiredCommitments,
					optionalCommitments,
					signersCommitment,
					viewersCommitment,
					placementCommitment: options.placementCommitment ?? defaultPlacement,
					documentSha256: options.documentSha256 ?? defaultDocumentSha256,
					senderEmailCommitment:
						options.senderEmailCommitment ?? defaultSenderEmail,
					senderAuthSubjectCommitment:
						options.senderAuthSubjectCommitment ?? defaultSenderAuth,
					orgIdCommitment: options.orgIdCommitment ?? zeroOrg,
					routingMode,
					routingOrder,
					quorumN,
					quorumSet,
					timestamp,
				}));

	if (!signature) {
		throw new Error("registerEnvelope requires a signature");
	}

	return {
		pieceCid: options.pieceCid,
		sender: senderAddress,
		requiredCommitments: options.requiredCommitments,
		optionalCommitments,
		viewerEmailCommitments,
		senderEmailCommitment: options.senderEmailCommitment ?? defaultSenderEmail,
		senderAuthSubjectCommitment:
			options.senderAuthSubjectCommitment ?? defaultSenderAuth,
		orgIdCommitment: options.orgIdCommitment ?? zeroOrg,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
		timestamp,
		signature,
		placementCommitment: options.placementCommitment ?? defaultPlacement,
		documentSha256: options.documentSha256 ?? defaultDocumentSha256,
	};
}

export async function registerEnvelopeOnly(
	ctx: FullSystemFixture,
	pieceCid: string,
	signerCommitments: Hex[],
	options: Omit<
		RegisterEnvelopeOptions,
		"pieceCid" | "requiredCommitments"
	> = {},
): Promise<void> {
	const input = await buildRegisterEnvelopeInput(ctx, {
		pieceCid,
		requiredCommitments: signerCommitments,
		...options,
	});
	await ctx.envelopeRegistry.write.registerEnvelope([input], {
		account: walletAccount(ctx.server),
	});
}

const signDefaults = {
	auth: `0x${"99".repeat(32)}` as Hex,
	dl3: `0x${"88".repeat(20)}` as Hex,
	root: `0x${"77".repeat(32)}` as Hex,
	leafVersion: 1,
};

export async function registerEnvelopeSignatureStep(args: {
	ctx: FullSystemFixture;
	pieceCid: string;
	senderAddr: `0x${string}`;
	signerWallet: WalletClient;
	signerEmailCommitment: Hex;
	routingOrder?: Hex[];
	quorumSet?: Hex[];
}): Promise<void> {
	const { ctx, pieceCid, senderAddr, signerWallet, signerEmailCommitment } =
		args;
	const routingOrder = args.routingOrder ?? [];
	const quorumSet = args.quorumSet ?? [];
	const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
	const reg = await ctx.envelopeRegistry.read.envelopeRegistrations([cidId]);
	const signTs = await latestBlockTimestamp(ctx.publicClient);
	const signSig = await signRegisterEnvelopeSignature({
		wallet: signerWallet,
		envelopeRegistryAddress: ctx.envelopeRegistry.address,
		chainId: ctx.chainId,
		pieceCid,
		sender: senderAddr,
		signerEmailCommitment,
		authSubjectCommitment: signDefaults.auth,
		dl3SignatureCommitment: signDefaults.dl3,
		completionsRoot: signDefaults.root,
		leafSchemaVersion: signDefaults.leafVersion,
		signersCommitment: reg.signersCommitment,
		timestamp: signTs,
	});
	await ctx.envelopeRegistry.write.registerEnvelopeSignature(
		[
			pieceCid,
			senderAddr,
			walletAccount(signerWallet).address,
			signerEmailCommitment,
			signDefaults.auth,
			signDefaults.dl3,
			signTs,
			signSig,
			signDefaults.root,
			signDefaults.leafVersion,
			routingOrder,
			quorumSet,
		],
		{ account: walletAccount(ctx.server) },
	);
}

export const emptyRoutingCalldata = {
	routingOrder: [] as Hex[],
	quorumSet: [] as Hex[],
};

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
