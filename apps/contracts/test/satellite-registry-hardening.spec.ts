import assert from "node:assert/strict";
import { expect } from "chai";
import type { Hex } from "viem";
import { keccak256, parseUnits, toBytes } from "viem";
import {
	deployFullSystem,
	deployFullSystemWithSatellites,
	registerEnvelopeOnly,
	registerEnvelopeSignatureStep,
	registerPaymentRule,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	signClearEnvelopeSignatures,
	signProposeSignerReplacement,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

const signerCommitment = `0x${"aa".repeat(32)}` as Hex;
const secondSignerCommitment = `0x${"bb".repeat(32)}` as Hex;
const zeroCommitment = `0x${"00".repeat(32)}` as Hex;
const amount = parseUnits("10", 6);

function cidId(piece: string): Hex {
	return keccak256(toBytes(piece));
}

describe("Satellite registry hardening", () => {
	it("setSatelliteContracts is write-once", async () => {
		const ctx = await deployFullSystemWithSatellites();
		await assert.rejects(
			ctx.envelopeRegistry.write.setSatelliteContracts(
				[ctx.paymentValidator.address, ctx.attachmentRelease.address],
				{ account: walletAccount(ctx.deployer) },
			),
		);
	});

	it("paid leg blocks clearEnvelopeSignatures", async () => {
		const ctx = await deployFullSystemWithSatellites();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "clear-block-paid-leg";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			legs: [{ recipient: recipientAddr, amount }],
		});
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});
		await ctx.paymentValidator.write.executePayoutLeg([ruleId, 0n], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.paymentValidator.read.hasAnyPaidLegForCid([id])).to.equal(
			true,
		);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const clearSig = await signClearEnvelopeSignatures({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid: piece,
			timestamp: ts,
		});
		await assert.rejects(
			ctx.envelopeRegistry.write.clearEnvelopeSignatures(
				[piece, senderAddr, ts, clearSig],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("paid leg blocks executeSignerReplacement", async () => {
		const ctx = await deployFullSystemWithSatellites();
		const oldC = secondSignerCommitment;
		const newC = `0x${"cc".repeat(32)}` as Hex;
		const piece = "swap-block-paid-leg";
		const id = cidId(piece);
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;

		await registerEnvelopeOnly(ctx, piece, [signerCommitment, oldC]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 2,
			thresholdN: 1,
			signerCommitments: [signerCommitment],
			legs: [{ recipient: recipientAddr, amount }],
		});
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});
		await ctx.paymentValidator.write.executePayoutLeg([ruleId, 0n], {
			account: walletAccount(ctx.payout),
		});

		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
				[signerCommitment, newC],
			]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid: piece,
			oldCommitment: oldC,
			newCommitment: newC,
			signersCommitmentAfter,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.proposeSignerReplacement(
			[piece, senderAddr, oldC, newC, ts, proposeSig, [], [], [], []],
			{ account: walletAccount(ctx.server) },
		);

		await assert.rejects(
			ctx.envelopeRegistry.write.executeSignerReplacement(
				[piece, senderAddr, [], []],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("clearEnvelopeSignatures reopens payout update and cancel", async () => {
		const ctx = await deployFullSystemWithSatellites();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "clear-reopens-payout-crud";
		const id = cidId(piece);
		const half = amount / 2n;

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			legs: [{ recipient: recipientAddr, amount }],
		});
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		await assert.rejects(
			ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
				account: walletAccount(ctx.sender),
			}),
		);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const clearSig = await signClearEnvelopeSignatures({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid: piece,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.clearEnvelopeSignatures(
			[piece, senderAddr, ts, clearSig],
			{ account: walletAccount(ctx.server) },
		);

		const reg = await ctx.envelopeRegistry.read.envelopeRegistrations([id]);
		expect(Number(reg.requiredSignaturesCount)).to.equal(0);

		await ctx.paymentValidator.write.updatePayoutRule(
			[
				ruleId,
				0,
				zeroCommitment,
				0,
				0n,
				[],
				[
					{ recipient: recipientAddr, amount: half },
					{
						recipient: walletAccount(ctx.coSigner).address,
						amount: half,
					},
				],
			],
			{ account: walletAccount(ctx.sender) },
		);

		await ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
			account: walletAccount(ctx.sender),
		});
		const ruleAfterCancel = await ctx.paymentValidator.read.rules([ruleId]);
		expect(ruleAfterCancel[8]).to.equal(true);
	});

	it("remaps SpecificSigner payout commitment on proposeSignerReplacement", async () => {
		const ctx = await deployFullSystemWithSatellites();
		const oldC = signerCommitment;
		const newC = secondSignerCommitment;
		const piece = "remap-payout-specific-signer";
		const id = cidId(piece);
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;

		await registerEnvelopeOnly(ctx, piece, [oldC]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 1,
			specificSignerCommitment: oldC,
			legs: [{ recipient: recipientAddr, amount }],
		});
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([[newC]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid: piece,
			oldCommitment: oldC,
			newCommitment: newC,
			signersCommitmentAfter,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.proposeSignerReplacement(
			[piece, senderAddr, oldC, newC, ts, proposeSig, [], [], [], []],
			{ account: walletAccount(ctx.server) },
		);

		const rule = await ctx.paymentValidator.read.rules([ruleId]);
		expect(rule[4]).to.equal(newC);
	});

	it("129th registerRule on same cidId reverts", async () => {
		const ctx = await deployFullSystemWithSatellites();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "max-rules-cap";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount * 129n]);
		await ctx.mockUsdc.write.approve(
			[ctx.paymentValidator.address, amount * 129n],
			{ account: walletAccount(ctx.sender) },
		);

		for (let i = 0; i < 128; i++) {
			await registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 0,
				legs: [{ recipient: recipientAddr, amount: 1n }],
			});
		}

		await assert.rejects(
			ctx.paymentValidator.write.registerRule(
				[
					senderAddr,
					ctx.mockUsdc.address,
					id,
					0,
					zeroCommitment,
					0,
					0n,
					[],
					[{ recipient: recipientAddr, amount: 1n }],
				],
				{ account: walletAccount(ctx.sender) },
			),
		);
	});

	it("proposeSignerReplacement succeeds when satellites unset (remap no-op)", async () => {
		const ctx = await deployFullSystem();
		const oldC = `0x${"71".repeat(32)}` as Hex;
		const newC = `0x${"72".repeat(32)}` as Hex;
		const piece = "remap-noop-unset";
		const senderAddr = walletAccount(ctx.sender).address;

		await registerEnvelopeOnly(ctx, piece, [oldC]);
		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([[newC]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid: piece,
			oldCommitment: oldC,
			newCommitment: newC,
			signersCommitmentAfter,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.proposeSignerReplacement(
			[piece, senderAddr, oldC, newC, ts, proposeSig, [], [], [], []],
			{ account: walletAccount(ctx.server) },
		);
		const freshCid = await ctx.envelopeRegistry.read.cidIdentifier([piece]);
		expect(await ctx.envelopeRegistry.read.isSigner([freshCid, newC])).to.equal(
			true,
		);
		expect(await ctx.envelopeRegistry.read.paymentValidator()).to.equal(
			"0x0000000000000000000000000000000000000000",
		);
	});

	it("updateAttachmentRule and cancel revert after required sign; clear reopens", async () => {
		const ctx = await deployFullSystemWithSatellites();
		const senderAddr = walletAccount(ctx.sender).address;
		const piece = "attachment-clear-crud";
		const id = cidId(piece);
		const packetHash = `0x${"22".repeat(32)}` as Hex;
		const newPacketHash = `0x${"33".repeat(32)}` as Hex;
		const recipientCommitment = `0x${"11".repeat(32)}` as Hex;

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await ctx.attachmentRelease.write.registerAttachmentRule(
			[id, packetHash, 0, zeroCommitment, 0, 0n, [], [recipientCommitment]],
			{ account: walletAccount(ctx.sender) },
		);
		const ruleId = 0n;

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		await assert.rejects(
			ctx.attachmentRelease.write.updateAttachmentRule(
				[
					ruleId,
					newPacketHash,
					0,
					zeroCommitment,
					0,
					0n,
					[],
					[recipientCommitment],
				],
				{ account: walletAccount(ctx.sender) },
			),
		);
		await assert.rejects(
			ctx.attachmentRelease.write.cancelAttachmentRule([ruleId], {
				account: walletAccount(ctx.sender),
			}),
		);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const clearSig = await signClearEnvelopeSignatures({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid: piece,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.clearEnvelopeSignatures(
			[piece, senderAddr, ts, clearSig],
			{ account: walletAccount(ctx.server) },
		);

		await ctx.attachmentRelease.write.updateAttachmentRule(
			[
				ruleId,
				newPacketHash,
				0,
				zeroCommitment,
				0,
				0n,
				[],
				[recipientCommitment],
			],
			{ account: walletAccount(ctx.sender) },
		);
		const ruleAfterUpdate = await ctx.attachmentRelease.read.rules([ruleId]);
		expect(ruleAfterUpdate[2]).to.equal(newPacketHash);

		await ctx.attachmentRelease.write.cancelAttachmentRule([ruleId], {
			account: walletAccount(ctx.sender),
		});
		const ruleAfterCancel = await ctx.attachmentRelease.read.rules([ruleId]);
		expect(ruleAfterCancel[9]).to.equal(true);
	});

	it("remaps attachment SpecificSigner commitment on proposeSignerReplacement", async () => {
		const ctx = await deployFullSystemWithSatellites();
		const oldC = signerCommitment;
		const newC = secondSignerCommitment;
		const piece = "remap-attachment-specific-signer";
		const id = cidId(piece);
		const senderAddr = walletAccount(ctx.sender).address;
		const packetHash = `0x${"44".repeat(32)}` as Hex;
		const recipientCommitment = `0x${"55".repeat(32)}` as Hex;

		await registerEnvelopeOnly(ctx, piece, [oldC]);
		await ctx.attachmentRelease.write.registerAttachmentRule(
			[id, packetHash, 1, oldC, 0, 0n, [], [recipientCommitment]],
			{ account: walletAccount(ctx.sender) },
		);

		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([[newC]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid: piece,
			oldCommitment: oldC,
			newCommitment: newC,
			signersCommitmentAfter,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.proposeSignerReplacement(
			[piece, senderAddr, oldC, newC, ts, proposeSig, [], [], [], []],
			{ account: walletAccount(ctx.server) },
		);

		const rule = await ctx.attachmentRelease.read.rules([0n]);
		expect(rule[5]).to.equal(newC);
	});
});
