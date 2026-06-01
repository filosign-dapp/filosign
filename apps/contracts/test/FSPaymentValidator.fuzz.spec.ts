import assert from "node:assert/strict";
import { expect } from "chai";
import type { Hex } from "viem";
import { keccak256, parseUnits, toBytes } from "viem";
import {
	deployFullSystem,
	registerEnvelopeOnly,
	registerEnvelopeSignatureStep,
	registerPaymentRule,
} from "./fixtures.js";
import { walletAccount } from "./helpers/walletAccount.js";

const signerCommitment = `0x${"aa".repeat(32)}` as Hex;

function cidId(piece: string): Hex {
	return keccak256(toBytes(piece));
}

/** Lightweight fuzz-style scenarios for leg bitmap and thresholds (not a formal property test runner). */
describe("FSPaymentValidator fuzz scenarios", () => {
	const legAmounts = [
		parseUnits("1", 6),
		parseUnits("3", 6),
		parseUnits("7", 6),
	];

	for (const [index, legAmount] of legAmounts.entries()) {
		it(`pays ${index + 1} independent legs with amount ${legAmount}`, async () => {
			const ctx = await deployFullSystem();
			const senderAddr = walletAccount(ctx.sender).address;
			const recipientAddr = walletAccount(ctx.payout).address;
			const altRecipient = walletAccount(ctx.coSigner).address;
			const piece = `fuzz-legs-${index}`;
			const id = cidId(piece);
			const total = legAmount * 2n;

			await registerEnvelopeOnly(ctx, piece, [signerCommitment]);
			await ctx.mockUsdc.write.mint([senderAddr, total]);
			const ruleId = await registerPaymentRule(ctx, {
				payer: senderAddr,
				token: ctx.mockUsdc.address,
				cidId: id,
				releaseType: 0,
				legs: [
					{ recipient: recipientAddr, amount: legAmount },
					{ recipient: altRecipient, amount: legAmount },
				],
			});
			await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, total], {
				account: walletAccount(ctx.sender),
			});
			await registerEnvelopeSignatureStep({
				ctx,
				pieceCid: piece,
				senderAddr,
				signerWallet: ctx.sender,
				signerEmailCommitment: signerCommitment,
			});

			await ctx.paymentValidator.write.executePayoutLeg([ruleId, 1n], {
				account: walletAccount(ctx.payout),
			});
			expect(await ctx.paymentValidator.read.isLegPaid([ruleId, 1n])).to.be
				.true;

			await ctx.paymentValidator.write.executePayoutLeg([ruleId, 0n], {
				account: walletAccount(ctx.payout),
			});
			expect(await ctx.paymentValidator.read.unpaidLegCount([ruleId])).to.equal(
				0n,
			);
			const rule = await ctx.paymentValidator.read.rules([ruleId]);
			expect(rule[7]).to.equal(true);
		});
	}

	it("AtLeastN release with threshold 2 of 3 commitments", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "fuzz-at-least-n";
		const id = cidId(piece);
		const amount = parseUnits("5", 6);
		const c1 = signerCommitment;
		const c2 = `0x${"cc".repeat(32)}` as Hex;
		const c3 = `0x${"dd".repeat(32)}` as Hex;

		await registerEnvelopeOnly(ctx, piece, [c1, c2, c3]);
		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		const ruleId = await registerPaymentRule(ctx, {
			payer: senderAddr,
			token: ctx.mockUsdc.address,
			cidId: id,
			releaseType: 2,
			thresholdN: 2,
			signerCommitments: [c1, c2, c3],
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
			signerEmailCommitment: c1,
		});
		assert.equal(await ctx.paymentValidator.read.canExecute([ruleId]), false);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: c2,
		});
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.true;

		await ctx.paymentValidator.write.executePayoutLeg([ruleId, 0n], {
			account: walletAccount(ctx.payout),
		});
		expect(await ctx.mockUsdc.read.balanceOf([recipientAddr])).to.equal(amount);
	});
});
