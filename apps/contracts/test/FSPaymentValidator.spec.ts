import assert from "node:assert/strict";
import { expect } from "chai";
import hre from "hardhat";
import type { Hex } from "viem";
import { keccak256, parseUnits, toBytes } from "viem";
import {
	deployFullSystem,
	registerEnvelopeOnly,
	registerEnvelopeSignatureStep,
	registerPaymentRule,
} from "./fixtures.js";
import { advanceBlockTime, latestBlockTimestamp } from "./helpers/chainTime.js";
import { walletAccount } from "./helpers/walletAccount.js";

const signerCommitment = `0x${"aa".repeat(32)}` as Hex;
const secondSignerCommitment = `0x${"bb".repeat(32)}` as Hex;
const zeroCommitment = `0x${"00".repeat(32)}` as Hex;
const pieceCid = "payment-test-doc";
const amount = parseUnits("10", 6);

function cidId(piece: string): Hex {
	return keccak256(toBytes(piece));
}

describe("FSPaymentValidator", () => {
	it("executes pull payout when all required signers signed", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const gelato = walletAccount(ctx.payout).address;
		const id = cidId(pieceCid);

		await registerEnvelopeOnly(ctx, pieceCid, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount * 2n]);
		const registeredRuleId = await registerPaymentRule(ctx, {
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
			pieceCid,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		expect(await ctx.paymentValidator.read.canExecute([registeredRuleId])).to.be
			.true;

		await ctx.paymentValidator.write.executePayout([registeredRuleId], {
			account: gelato,
		});

		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
		expect(await ctx.paymentValidator.read.canExecute([registeredRuleId])).to.be
			.false;

		await assert.rejects(
			ctx.paymentValidator.write.executePayout([registeredRuleId], {
				account: gelato,
			}),
		);
	});

	it("allows executePayout from any address when conditions are met", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("permissionless-exec");

		await registerEnvelopeOnly(ctx, "permissionless-exec", [signerCommitment]);
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
			pieceCid: "permissionless-exec",
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.sender),
		});

		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("reverts registerRule when file is not registered", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("missing-file");

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 0,
				legs: [{ recipient: recipientAddr, amount }],
			}),
		);
	});

	it("reverts when release conditions are not met", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("unsigned-doc");

		await registerEnvelopeOnly(ctx, "unsigned-doc", [signerCommitment]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			legs: [{ recipient: recipientAddr, amount }],
		});

		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await assert.rejects(
			ctx.paymentValidator.write.executePayout([ruleId], {
				account: walletAccount(ctx.payout),
			}),
		);
	});

	it("SpecificSigner: pays when that signer signed", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const specificPiece = "specific-signer-doc";
		const id = cidId(specificPiece);

		await registerEnvelopeOnly(ctx, specificPiece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 1,
			specificSignerCommitment: signerCommitment,
			legs: [{ recipient: recipientAddr, amount }],
		});
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: specificPiece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});

		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("AtLeastN: pays when N distinct signers have signed", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "at-least-n-doc";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 2,
			thresholdN: 2,
			signerCommitments: [signerCommitment, secondSignerCommitment],
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
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: secondSignerCommitment,
		});
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.true;

		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("AtLeastN: reverts registerRule on duplicate commitments", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("dup-commitments");

		await registerEnvelopeOnly(ctx, "dup-commitments", [signerCommitment]);

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 2,
				thresholdN: 2,
				signerCommitments: [signerCommitment, signerCommitment],
				legs: [{ recipient: recipientAddr, amount }],
			}),
		);
	});

	it("AtLeastN: reverts registerRule on zero commitment", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("zero-commitment");

		await registerEnvelopeOnly(ctx, "zero-commitment", [signerCommitment]);

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 2,
				thresholdN: 1,
				signerCommitments: [zeroCommitment],
				legs: [{ recipient: recipientAddr, amount }],
			}),
		);
	});

	it("executePayout reverts without allowance and leaves rule unexecuted", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "no-allowance-doc";
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

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.true;

		await assert.rejects(
			ctx.paymentValidator.write.executePayout([ruleId], {
				account: walletAccount(ctx.payout),
			}),
		);

		const rule = await ctx.paymentValidator.read.rules([ruleId]);
		expect(rule[7]).to.equal(false);
	});

	it("cancelPayoutRule blocks executePayout", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "cancel-rule-doc";
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

		await ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
			account: walletAccount(ctx.sender),
		});
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;
	});

	it("cancelPayoutRule reverts when already cancelled", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "double-cancel";
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

		await ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
			account: walletAccount(ctx.sender),
		});

		await assert.rejects(
			ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
				account: walletAccount(ctx.sender),
			}),
		);
	});

	it("updatePayoutRule changes legs before execute", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const altRecipient = walletAccount(ctx.coSigner).address;
		const piece = "update-rule-doc";
		const id = cidId(piece);
		const half = amount / 2n;

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
					{ recipient: altRecipient, amount: half },
				],
			],
			{ account: walletAccount(ctx.sender) },
		);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(half);
		expect(await ctx.mockUsdc.read.balanceOf([altRecipient])).to.equal(half);
	});

	it("executes atomic payout with 32 legs", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const id = cidId("thirty-two-legs");
		const legAmount = parseUnits("1", 6);
		const total = legAmount * 32n;
		const recipientAddr = walletAccount(ctx.payout).address;
		const legs = Array.from({ length: 32 }, () => ({
			recipient: recipientAddr,
			amount: legAmount,
		}));

		await registerEnvelopeOnly(ctx, "thirty-two-legs", [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, total]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			legs,
		});
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, total], {
			account: walletAccount(ctx.sender),
		});
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: "thirty-two-legs",
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});

		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});

		for (const leg of legs) {
			expect(await ctx.mockUsdc.read.balanceOf([leg.recipient])).to.equal(
				total,
			);
		}
	});

	it("AllRequiredSigned: pays when all required signers signed", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "all-required-signed";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 3,
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
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: secondSignerCommitment,
		});
		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("AllSignedComplete: pays when envelope complete (completedAt)", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "all-signed-complete";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 4,
			legs: [{ recipient: recipientAddr, amount }],
		});
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});
		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("QuorumRequired: uses registry quorum when configured", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "quorum-required-registry";
		const id = cidId(piece);

		await registerEnvelopeOnly(
			ctx,
			piece,
			[signerCommitment, secondSignerCommitment],
			{
				quorumN: 2,
				quorumSet: [signerCommitment, secondSignerCommitment],
			},
		);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 5,
			thresholdN: 2,
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
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: secondSignerCommitment,
		});
		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("QuorumRequired: uses threshold against required signers when no registry quorum", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "quorum-required-threshold";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 5,
			thresholdN: 1,
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
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.true;
	});

	it("QuorumSet: pays when N of payer commitments sign", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "quorum-set";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 6,
			thresholdN: 2,
			signerCommitments: [signerCommitment, secondSignerCommitment],
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
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: secondSignerCommitment,
		});
		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("QuorumAll: pays when N of full roster sign", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const optional = `0x${"dd".repeat(32)}` as Hex;
		const piece = "quorum-all";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
			optional,
		]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 7,
			thresholdN: 3,
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
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: secondSignerCommitment,
		});
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.payout,
			signerEmailCommitment: optional,
		});
		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("AllOfSet: pays only when every listed commitment signs", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "all-of-set";
		const id = cidId(piece);

		await registerEnvelopeOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 8,
			signerCommitments: [signerCommitment, secondSignerCommitment],
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
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: secondSignerCommitment,
		});
		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});

	it("expiresAt blocks execute after deadline", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "expiring-rule";
		const id = cidId(piece);
		const now = await latestBlockTimestamp(ctx.publicClient);
		const expiresAt = now + 3600n;

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			expiresAt,
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

		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.true;
		await advanceBlockTime(ctx.publicClient, 3601);
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;
		await assert.rejects(
			ctx.paymentValidator.write.executePayout([ruleId], {
				account: walletAccount(ctx.payout),
			}),
		);
	});

	it("reverts executePayout for fee-on-transfer tokens", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "fee-token-doc";
		const id = cidId(piece);
		const feeToken = await hre.viem.deployContract("MockFeeOnTransferToken", [
			walletAccount(ctx.deployer).address,
		]);

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await feeToken.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: feeToken.address,
			cidId: id,
			releaseType: 0,
			legs: [{ recipient: recipientAddr, amount }],
		});
		await feeToken.write.approve([ctx.paymentValidator.address, amount], {
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
			ctx.paymentValidator.write.executePayout([ruleId], {
				account: walletAccount(ctx.payout),
			}),
		);
		const rule = await ctx.paymentValidator.read.rules([ruleId]);
		expect(rule[7]).to.equal(false);
	});

	it("registerRule reverts when legs exceed MAX 32", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("too-many-legs");
		await registerEnvelopeOnly(ctx, "too-many-legs", [signerCommitment]);
		const legs = Array.from({ length: 33 }, () => ({
			recipient: recipientAddr,
			amount: 1n,
		}));

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 0,
				legs,
			}),
		);
	});

	it("registerRule reverts when commitments exceed MAX 128", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("too-many-commitments");
		await registerEnvelopeOnly(ctx, "too-many-commitments", [signerCommitment]);
		const commitments = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`rule-commitment-${i}`)),
		);

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 2,
				thresholdN: 1,
				signerCommitments: commitments,
				legs: [{ recipient: recipientAddr, amount }],
			}),
		);
	});

	it("executePayout reverts after cancelPayoutRule", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "cancel-then-execute";
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
		await ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
			account: walletAccount(ctx.sender),
		});

		await assert.rejects(
			ctx.paymentValidator.write.executePayout([ruleId], {
				account: walletAccount(ctx.payout),
			}),
		);
	});

	it("executePayoutLeg pays legs independently until fully executed", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientA = walletAccount(ctx.payout).address;
		const recipientB = walletAccount(ctx.deployer).address;
		const piece = "per-leg-payout";
		const id = cidId(piece);
		const leg0 = amount / 2n;
		const leg1 = amount - leg0;

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			legs: [
				{ recipient: recipientA, amount: leg0 },
				{ recipient: recipientB, amount: leg1 },
			],
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

		expect(await ctx.paymentValidator.read.isLegPaid([ruleId, 0n])).to.be.false;
		expect(await ctx.paymentValidator.read.isLegPaid([ruleId, 1n])).to.be.false;
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.true;

		await ctx.paymentValidator.write.executePayoutLeg([ruleId, 0n], {
			account: walletAccount(ctx.payout),
		});

		let rule = await ctx.paymentValidator.read.rules([ruleId]);
		expect(rule[7]).to.equal(false);
		expect(await ctx.paymentValidator.read.isLegPaid([ruleId, 0n])).to.be.true;
		expect(await ctx.paymentValidator.read.isLegPaid([ruleId, 1n])).to.be.false;
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.true;
		expect(await ctx.paymentValidator.read.unpaidLegCount([ruleId])).to.equal(
			1n,
		);

		await ctx.paymentValidator.write.executePayoutLeg([ruleId, 1n], {
			account: walletAccount(ctx.deployer),
		});

		rule = await ctx.paymentValidator.read.rules([ruleId]);
		expect(rule[7]).to.equal(true);
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;
	});

	it("registerRule reverts when leg recipient equals payer", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const id = cidId("payer-is-recipient");
		await registerEnvelopeOnly(ctx, "payer-is-recipient", [signerCommitment]);

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 0,
				legs: [{ recipient: senderAddr, amount }],
			}),
		);
	});

	it("registerRule reverts when leg recipient is the payment validator", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const id = cidId("validator-is-recipient");
		await registerEnvelopeOnly(ctx, "validator-is-recipient", [
			signerCommitment,
		]);

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 0,
				legs: [{ recipient: ctx.paymentValidator.address, amount }],
			}),
		);
	});

	it("registerRule reverts when leg recipient is the payout token contract", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const id = cidId("token-is-recipient");
		await registerEnvelopeOnly(ctx, "token-is-recipient", [signerCommitment]);

		await assert.rejects(
			registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 0,
				legs: [{ recipient: ctx.mockUsdc.address, amount }],
			}),
		);
	});

	it("updatePayoutRule reverts after any leg was paid", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientA = walletAccount(ctx.payout).address;
		const recipientB = walletAccount(ctx.deployer).address;
		const piece = "update-after-partial";
		const id = cidId(piece);
		const leg0 = amount / 2n;
		const leg1 = amount - leg0;

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			legs: [
				{ recipient: recipientA, amount: leg0 },
				{ recipient: recipientB, amount: leg1 },
			],
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

		await assert.rejects(
			ctx.paymentValidator.write.updatePayoutRule(
				[
					ruleId,
					0,
					zeroCommitment,
					0,
					0n,
					[],
					[{ recipient: recipientB, amount: leg1 }],
				],
				{ account: walletAccount(ctx.sender) },
			),
		);
	});

	it("executePayoutLeg reverts when leg already paid", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "double-leg-pay";
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

		await assert.rejects(
			ctx.paymentValidator.write.executePayoutLeg([ruleId, 0n], {
				account: walletAccount(ctx.payout),
			}),
		);
	});

	it("updatePayoutRule and cancelPayoutRule revert after execute", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "post-execute-crud";
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
		await ctx.paymentValidator.write.executePayout([ruleId], {
			account: walletAccount(ctx.payout),
		});

		await assert.rejects(
			ctx.paymentValidator.write.updatePayoutRule(
				[
					ruleId,
					0,
					zeroCommitment,
					0,
					0n,
					[],
					[{ recipient: recipientAddr, amount }],
				],
				{ account: walletAccount(ctx.sender) },
			),
		);
		await assert.rejects(
			ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
				account: walletAccount(ctx.sender),
			}),
		);
	});

	it("updatePayoutRule reverts after a required signer signs (SEC-03)", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "sec03-update-lock";
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

		await assert.rejects(
			ctx.paymentValidator.write.updatePayoutRule(
				[
					ruleId,
					0,
					zeroCommitment,
					0,
					0n,
					[],
					[{ recipient: recipientAddr, amount }],
				],
				{ account: walletAccount(ctx.sender) },
			),
		);
	});

	it("cancelPayoutRule still allowed after required signer signs (SEC-13)", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "sec13-cancel-after-sign";
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

		await ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
			account: walletAccount(ctx.sender),
		});
		const ruleAfterCancel = await ctx.paymentValidator.read.rules([ruleId]);
		expect(ruleAfterCancel[8]).to.equal(true);
	});

	it("updatePayoutRule allowed before any required signature", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "sec03-before-sign";
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
	});

	it("cancelPayoutRule allowed after partial leg paid (SEC-13)", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const altRecipient = walletAccount(ctx.coSigner).address;
		const piece = "sec13-cancel-partial";
		const id = cidId(piece);
		const half = amount / 2n;

		await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 0,
			legs: [
				{ recipient: recipientAddr, amount: half },
				{ recipient: altRecipient, amount: half },
			],
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

		await ctx.paymentValidator.write.cancelPayoutRule([ruleId], {
			account: walletAccount(ctx.sender),
		});
		const ruleAfterPartialCancel = await ctx.paymentValidator.read.rules([
			ruleId,
		]);
		expect(ruleAfterPartialCancel[8]).to.equal(true);
		await assert.rejects(
			ctx.paymentValidator.write.executePayoutLeg([ruleId, 1n], {
				account: walletAccount(ctx.payout),
			}),
		);
	});
});
