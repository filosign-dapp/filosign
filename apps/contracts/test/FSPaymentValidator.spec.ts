import assert from "node:assert/strict";
import { expect } from "chai";
import type { Hex } from "viem";
import { keccak256, parseUnits, toBytes } from "viem";
import {
	deployFullSystem,
	registerFileOnly,
	registerFileSignatureStep,
} from "./fixtures.js";
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
	it("executes pull payout when all signers signed", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const gelato = walletAccount(ctx.payout).address;
		const id = cidId(pieceCid);

		await ctx.mockUsdc.write.mint([senderAddr, amount * 2n]);
		await ctx.paymentValidator.write.registerRule(
			[
				senderAddr,
				recipientAddr,
				ctx.mockUsdc.address,
				amount,
				id,
				0, // AllSigned
				`0x${"00".repeat(32)}`,
				0,
				[],
			],
			{ account: walletAccount(ctx.sender) },
		);
		const registeredRuleId =
			(await ctx.paymentValidator.read.nextRuleId()) - 1n;

		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		await registerFileOnly(ctx, pieceCid, [signerCommitment]);
		await registerFileSignatureStep({
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

		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		await ctx.paymentValidator.write.registerRule(
			[
				senderAddr,
				recipientAddr,
				ctx.mockUsdc.address,
				amount,
				id,
				0,
				`0x${"00".repeat(32)}`,
				0,
				[],
			],
			{ account: walletAccount(ctx.sender) },
		);
		const ruleId = (await ctx.paymentValidator.read.nextRuleId()) - 1n;
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		await registerFileOnly(ctx, "permissionless-exec", [signerCommitment]);
		await registerFileSignatureStep({
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

	it("reverts when release conditions are not met", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("unsigned-doc");

		await ctx.paymentValidator.write.registerRule(
			[
				senderAddr,
				recipientAddr,
				ctx.mockUsdc.address,
				amount,
				id,
				0,
				`0x${"00".repeat(32)}`,
				0,
				[],
			],
			{ account: walletAccount(ctx.sender) },
		);
		const ruleId = (await ctx.paymentValidator.read.nextRuleId()) - 1n;

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

		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		await ctx.paymentValidator.write.registerRule(
			[
				senderAddr,
				recipientAddr,
				ctx.mockUsdc.address,
				amount,
				id,
				1, // SpecificSigner
				signerCommitment,
				0,
				[],
			],
			{ account: walletAccount(ctx.sender) },
		);
		const ruleId = (await ctx.paymentValidator.read.nextRuleId()) - 1n;
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		await registerFileOnly(ctx, specificPiece, [signerCommitment]);
		await registerFileSignatureStep({
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

		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		await ctx.paymentValidator.write.registerRule(
			[
				senderAddr,
				recipientAddr,
				ctx.mockUsdc.address,
				amount,
				id,
				2, // AtLeastN
				zeroCommitment,
				2,
				[signerCommitment, secondSignerCommitment],
			],
			{ account: walletAccount(ctx.sender) },
		);
		const ruleId = (await ctx.paymentValidator.read.nextRuleId()) - 1n;
		await ctx.mockUsdc.write.approve([ctx.paymentValidator.address, amount], {
			account: walletAccount(ctx.sender),
		});

		await registerFileOnly(ctx, piece, [
			signerCommitment,
			secondSignerCommitment,
		]);
		await registerFileSignatureStep({
			ctx,
			pieceCid: piece,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: signerCommitment,
		});
		expect(await ctx.paymentValidator.read.canExecute([ruleId])).to.be.false;

		await registerFileSignatureStep({
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

		await assert.rejects(
			ctx.paymentValidator.write.registerRule(
				[
					senderAddr,
					recipientAddr,
					ctx.mockUsdc.address,
					amount,
					id,
					2,
					zeroCommitment,
					2,
					[signerCommitment, signerCommitment],
				],
				{ account: walletAccount(ctx.sender) },
			),
		);
	});

	it("AtLeastN: reverts registerRule on zero commitment", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const id = cidId("zero-commitment");

		await assert.rejects(
			ctx.paymentValidator.write.registerRule(
				[
					senderAddr,
					recipientAddr,
					ctx.mockUsdc.address,
					amount,
					id,
					2,
					zeroCommitment,
					1,
					[zeroCommitment],
				],
				{ account: walletAccount(ctx.sender) },
			),
		);
	});

	it("executePayout reverts without allowance and leaves rule unexecuted", async () => {
		const ctx = await deployFullSystem();
		const senderAddr = walletAccount(ctx.sender).address;
		const recipientAddr = walletAccount(ctx.payout).address;
		const piece = "no-allowance-doc";
		const id = cidId(piece);

		await ctx.mockUsdc.write.mint([senderAddr, amount]);
		await ctx.paymentValidator.write.registerRule(
			[
				senderAddr,
				recipientAddr,
				ctx.mockUsdc.address,
				amount,
				id,
				0,
				zeroCommitment,
				0,
				[],
			],
			{ account: walletAccount(ctx.sender) },
		);
		const ruleId = (await ctx.paymentValidator.read.nextRuleId()) - 1n;

		await registerFileOnly(ctx, piece, [signerCommitment]);
		await registerFileSignatureStep({
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
		expect(rule[8]).to.equal(false);
	});
});
