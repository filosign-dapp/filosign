import assert from "node:assert/strict";
import { expect } from "chai";
import hre from "hardhat";
import type { Hex } from "viem";
import { keccak256, toBytes } from "viem";
import {
	deployFullSystem,
	registerFileOnly,
	registerFileSignatureStep,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	signRegisterFile,
	signRegisterFileSignature,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

const defaultPlacement = `0x${"ab".repeat(32)}` as Hex;
const defaultSenderEmail = `0x${"cd".repeat(32)}` as Hex;
const defaultSenderPrivy = `0x${"ef".repeat(32)}` as Hex;
const zeroOrg =
	"0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

describe("FSFileRegistry", () => {
	it("computeEmailSignerCommitment: empty list yields zero bytes20", async () => {
		const ctx = await deployFullSystem();
		const z = await ctx.fileRegistry.read.computeEmailSignerCommitment([
			[] as Hex[],
		]);
		expect(z).to.equal("0x0000000000000000000000000000000000000000");
	});

	it("computeEmailSignerCommitment: reverts on unsorted commitments", async () => {
		const ctx = await deployFullSystem();
		const hi = `0x${"02".repeat(32)}` as Hex;
		const lo = `0x${"01".repeat(32)}` as Hex;
		await assert.rejects(
			ctx.fileRegistry.read.computeEmailSignerCommitment([[hi, lo]]),
		);
	});

	it("computeEmailSignerCommitment: reverts on zero commitment", async () => {
		const ctx = await deployFullSystem();
		const z = `0x${"00".repeat(32)}` as Hex;
		const lo = `0x${"01".repeat(32)}` as Hex;
		await assert.rejects(
			ctx.fileRegistry.read.computeEmailSignerCommitment([[z, lo]]),
		);
	});

	it("registerFile reverts when file already registered", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"b1".repeat(32)}` as Hex;
		const pieceCid = "dup-file";
		await registerFileOnly(ctx, pieceCid, [c]);

		const sc = await ctx.fileRegistry.read.computeEmailSignerCommitment([[c]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const sig = await signRegisterFile({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			signersCommitment: sc,
			placementCommitment: defaultPlacement,
			senderEmailCommitment: defaultSenderEmail,
			senderPrivySubjectCommitment: defaultSenderPrivy,
			timestamp: ts,
			nonce,
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					[c],
					[],
					defaultSenderEmail,
					defaultSenderPrivy,
					zeroOrg,
					ts,
					sig,
					defaultPlacement,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFile reverts on invalid signature", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"c1".repeat(32)}` as Hex;
		const pieceCid = "bad-sig";
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const fakeSig = `0x${"ab".repeat(65)}` as `0x${string}`;
		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					[c],
					[],
					defaultSenderEmail,
					defaultSenderPrivy,
					zeroOrg,
					ts,
					fakeSig,
					defaultPlacement,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFileSignature reverts for invalid signer commitment", async () => {
		const ctx = await deployFullSystem();
		const onFile = `0x${"d1".repeat(32)}` as Hex;
		const notOnFile = `0x${"d2".repeat(32)}` as Hex;
		const pieceCid = "invalid-signer";
		await registerFileOnly(ctx, pieceCid, [onFile]);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const n = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.payout).address,
		]);
		const signSig = await signRegisterFileSignature({
			wallet: ctx.payout,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			sender: walletAccount(ctx.sender).address,
			signerEmailCommitment: notOnFile,
			privySubjectCommitment: defaultSenderPrivy,
			dl3SignatureCommitment: `0x${"88".repeat(20)}` as Hex,
			completionsRoot: defaultPlacement,
			leafSchemaVersion: 1,
			timestamp: ts,
			nonce: n,
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFileSignature(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					walletAccount(ctx.payout).address,
					notOnFile,
					defaultSenderPrivy,
					`0x${"88".repeat(20)}`,
					ts,
					signSig,
					defaultPlacement,
					1,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFileSignature reverts when already signed", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"e1".repeat(32)}` as Hex;
		const pieceCid = "double-sign";
		await registerFileOnly(ctx, pieceCid, [c]);
		const step = {
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: c,
		};
		await registerFileSignatureStep(step);
		await assert.rejects(registerFileSignatureStep(step));
	});

	it("two signers: both can register signatures", async () => {
		const ctx = await deployFullSystem();
		const ca = `0x${"01".repeat(32)}` as Hex;
		const cb = `0x${"02".repeat(32)}` as Hex;
		const pieceCid = "two-signers";

		await registerFileOnly(ctx, pieceCid, [ca, cb]);

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: ca,
		});

		const clients = await hre.viem.getWalletClients();
		const signerB = clients[4];

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: signerB,
			signerEmailCommitment: cb,
		});

		const cidId = await ctx.fileRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.fileRegistry.read.allSigned([cidId])).to.equal(true);
	});

	it("cidIdentifier is keccak256 of piece CID string", async () => {
		const ctx = await deployFullSystem();
		const piece = "bafy-piece";
		const cidId = await ctx.fileRegistry.read.cidIdentifier([piece]);
		expect(cidId).to.equal(keccak256(toBytes(piece)));
	});
});
