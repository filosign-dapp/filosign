import assert from "node:assert/strict";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { deployFullSystem } from "./fixtures.js";
import { signApproveSender } from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

describe("FSManager", () => {
	it("approveSender approves when recipient EIP-712 signature valid", async () => {
		const ctx = await deployFullSystem();
		const recipient = ctx.payout;
		const deadline = BigInt((await time.latest()) + 600);

		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(ctx.sender).address,
			nonce: 0n,
			deadline,
		});

		await ctx.manager.write.approveSender(
			[
				walletAccount(recipient).address,
				walletAccount(ctx.sender).address,
				0n,
				deadline,
				sig,
			],
			{ account: walletAccount(ctx.server) },
		);

		expect(
			await ctx.manager.read.approvedSenders([
				walletAccount(recipient).address,
				walletAccount(ctx.sender).address,
			]),
		).to.equal(true);
	});

	it("approveSender supports ERC-1271 recipient signatures", async () => {
		const ctx = await deployFullSystem();
		const recipientContract = await hre.viem.deployContract(
			"MockERC1271Signer",
			[true],
		);
		const deadline = BigInt((await time.latest()) + 600);

		await ctx.manager.write.approveSender(
			[
				recipientContract.address,
				walletAccount(ctx.sender).address,
				0n,
				deadline,
				"0x1234",
			],
			{ account: walletAccount(ctx.server) },
		);

		expect(
			await ctx.manager.read.approvedSenders([
				recipientContract.address,
				walletAccount(ctx.sender).address,
			]),
		).to.equal(true);
	});

	it("approveSender reverts when sender not registered in key registry", async () => {
		const ctx = await deployFullSystem();
		const recipient = ctx.payout;
		const clients = await hre.viem.getWalletClients();
		const unregistered = clients[5];
		assert(unregistered, "expected sixth Hardhat wallet client");
		const deadline = BigInt((await time.latest()) + 600);

		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(unregistered).address,
			nonce: 0n,
			deadline,
		});

		await assert.rejects(
			ctx.manager.write.approveSender(
				[
					walletAccount(recipient).address,
					walletAccount(unregistered).address,
					0n,
					deadline,
					sig,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("approveSender reverts on wrong nonce", async () => {
		const ctx = await deployFullSystem();
		const recipient = ctx.payout;
		const deadline = BigInt((await time.latest()) + 600);

		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(ctx.sender).address,
			nonce: 1n,
			deadline,
		});

		await assert.rejects(
			ctx.manager.write.approveSender(
				[
					walletAccount(recipient).address,
					walletAccount(ctx.sender).address,
					1n,
					deadline,
					sig,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("approveSender reverts when deadline passed", async () => {
		const ctx = await deployFullSystem();
		const recipient = ctx.payout;
		const deadline = BigInt((await time.latest()) + 60);

		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(ctx.sender).address,
			nonce: 0n,
			deadline,
		});

		await time.increase(120);

		await assert.rejects(
			ctx.manager.write.approveSender(
				[
					walletAccount(recipient).address,
					walletAccount(ctx.sender).address,
					0n,
					deadline,
					sig,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("revokeSender clears approval", async () => {
		const ctx = await deployFullSystem();
		const recipient = ctx.payout;
		const deadline = BigInt((await time.latest()) + 600);

		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(ctx.sender).address,
			nonce: 0n,
			deadline,
		});

		await ctx.manager.write.approveSender(
			[
				walletAccount(recipient).address,
				walletAccount(ctx.sender).address,
				0n,
				deadline,
				sig,
			],
			{ account: walletAccount(ctx.server) },
		);

		await ctx.manager.write.revokeSender([walletAccount(ctx.sender).address], {
			account: walletAccount(recipient),
		});

		expect(
			await ctx.manager.read.approvedSenders([
				walletAccount(recipient).address,
				walletAccount(ctx.sender).address,
			]),
		).to.equal(false);
	});
});
