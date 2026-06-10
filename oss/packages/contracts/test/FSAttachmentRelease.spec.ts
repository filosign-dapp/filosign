import assert from "node:assert/strict";
import { expect } from "chai";
import type { Hex } from "viem";
import {
	deployAttachmentRelease,
	deployFullSystem,
	registerEnvelopeOnly,
	setOrgControllersForTest,
	testOrgIdCommitment,
} from "./fixtures.js";
import { walletAccount } from "./helpers/walletAccount.js";

const recipientCommitment = `0x${"11".repeat(32)}` as Hex;
const packetHash = `0x${"22".repeat(32)}` as Hex;

describe("FSAttachmentRelease org controller ACL", () => {
	it("registerAttachmentRule by org controller when synced on registry", async () => {
		const ctx = await deployFullSystem();
		const attachment = await deployAttachmentRelease(ctx);
		const signerCommitment = `0x${"33".repeat(32)}` as Hex;
		const pieceCid = "attachment-org-controller-register";
		const controller = walletAccount(ctx.payout).address;

		await setOrgControllersForTest(ctx, testOrgIdCommitment, [controller]);
		await registerEnvelopeOnly(ctx, pieceCid, [signerCommitment], {
			orgIdCommitment: testOrgIdCommitment,
		});
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);

		await attachment.write.registerAttachmentRule(
			[
				cidId,
				packetHash,
				0,
				`0x${"00".repeat(32)}`,
				0,
				0,
				[],
				[recipientCommitment],
			],
			{ account: walletAccount(ctx.payout) },
		);

		const ruleIds = await attachment.read.ruleIdsForCid([cidId]);
		expect(ruleIds).to.have.length(1);
		const rule = await attachment.read.rules([ruleIds[0]]);
		const packetContentHash = Array.isArray(rule)
			? rule[2]
			: rule.packetContentHash;
		expect(packetContentHash).to.equal(packetHash);
	});

	it("registerAttachmentRule reverts for wallet not in controller set", async () => {
		const ctx = await deployFullSystem();
		const attachment = await deployAttachmentRelease(ctx);
		const signerCommitment = `0x${"44".repeat(32)}` as Hex;
		const pieceCid = "attachment-non-controller-register";

		await setOrgControllersForTest(ctx, testOrgIdCommitment, [
			walletAccount(ctx.payout).address,
		]);
		await registerEnvelopeOnly(ctx, pieceCid, [signerCommitment], {
			orgIdCommitment: testOrgIdCommitment,
		});
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		const intruder = walletAccount(ctx.coSigner);

		await assert.rejects(
			attachment.write.registerAttachmentRule(
				[
					cidId,
					packetHash,
					0,
					`0x${"00".repeat(32)}`,
					0,
					0,
					[],
					[recipientCommitment],
				],
				{ account: intruder },
			),
		);
	});

	it("cancelAttachmentRule by org controller before any required signature", async () => {
		const ctx = await deployFullSystem();
		const attachment = await deployAttachmentRelease(ctx);
		const signerCommitment = `0x${"55".repeat(32)}` as Hex;
		const pieceCid = "attachment-org-controller-cancel";
		const controller = walletAccount(ctx.payout).address;

		await setOrgControllersForTest(ctx, testOrgIdCommitment, [controller]);
		await registerEnvelopeOnly(ctx, pieceCid, [signerCommitment], {
			orgIdCommitment: testOrgIdCommitment,
		});
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);

		await attachment.write.registerAttachmentRule(
			[
				cidId,
				packetHash,
				0,
				`0x${"00".repeat(32)}`,
				0,
				0,
				[],
				[recipientCommitment],
			],
			{ account: walletAccount(ctx.sender) },
		);

		await attachment.write.cancelAttachmentRule([0n], {
			account: walletAccount(ctx.payout),
		});

		const ruleIds = await attachment.read.ruleIdsForCid([cidId]);
		const rule = await attachment.read.rules([ruleIds[0]]);
		const cancelled = Array.isArray(rule) ? rule[9] : rule.cancelled;
		expect(cancelled).to.equal(true);
	});

	it("cancelAttachmentRule reverts for wallet not in controller set", async () => {
		const ctx = await deployFullSystem();
		const attachment = await deployAttachmentRelease(ctx);
		const signerCommitment = `0x${"66".repeat(32)}` as Hex;
		const pieceCid = "attachment-non-controller-cancel";

		await setOrgControllersForTest(ctx, testOrgIdCommitment, [
			walletAccount(ctx.payout).address,
		]);
		await registerEnvelopeOnly(ctx, pieceCid, [signerCommitment], {
			orgIdCommitment: testOrgIdCommitment,
		});
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);

		await attachment.write.registerAttachmentRule(
			[
				cidId,
				packetHash,
				0,
				`0x${"00".repeat(32)}`,
				0,
				0,
				[],
				[recipientCommitment],
			],
			{ account: walletAccount(ctx.sender) },
		);

		await assert.rejects(
			attachment.write.cancelAttachmentRule([0n], {
				account: walletAccount(ctx.coSigner),
			}),
		);
	});
});
