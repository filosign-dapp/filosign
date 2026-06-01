import assert from "node:assert/strict";
import { expect } from "chai";
import type { Hex } from "viem";
import { getAddress } from "viem";
import {
	buildRegisterEnvelopeInput,
	deployFullSystem,
	deployMock1271,
	registerEnvelopeOnly,
	setMock1271Valid,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import { walletAccount } from "./helpers/walletAccount.js";

const defaultViewerPrivy = `0x${"99".repeat(32)}` as Hex;
const dummy1271Sig = "0x1234" as Hex;

describe("ERC-1271 signature paths (Safe-compatible)", () => {
	describe("FSEnvelopeRegistry", () => {
		it("registerEnvelope accepts ERC-1271 sender signatures", async () => {
			const ctx = await deployFullSystem();
			const contractSender = await deployMock1271(true);

			const signerCommitment = `0x${"f1".repeat(32)}` as Hex;
			const pieceCid = "erc1271-register-file";
			const input = await buildRegisterEnvelopeInput(ctx, {
				pieceCid,
				requiredCommitments: [signerCommitment],
				sender: contractSender,
				signature: dummy1271Sig,
			});

			await ctx.envelopeRegistry.write.registerEnvelope([input], {
				account: walletAccount(ctx.server),
			});

			const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
			const file = await ctx.envelopeRegistry.read.envelopeRegistrations([
				cidId,
			]);
			expect(getAddress(file.sender)).to.equal(getAddress(contractSender));
		});

		it("registerEnvelope reverts when ERC-1271 sender returns invalid magic", async () => {
			const ctx = await deployFullSystem();
			const contractSender = await deployMock1271(true);
			await setMock1271Valid(contractSender, false);

			const signerCommitment = `0x${"f2".repeat(32)}` as Hex;
			const pieceCid = "erc1271-bad-register";
			const input = await buildRegisterEnvelopeInput(ctx, {
				pieceCid,
				requiredCommitments: [signerCommitment],
				sender: contractSender,
				signature: dummy1271Sig,
			});

			await assert.rejects(
				ctx.envelopeRegistry.write.registerEnvelope([input], {
					account: walletAccount(ctx.server),
				}),
			);
		});

		it("registerEnvelopeSignature accepts ERC-1271 signerWallet signatures", async () => {
			const ctx = await deployFullSystem();
			const contractSigner = await deployMock1271(true);

			const signerCommitment = `0x${"f3".repeat(32)}` as Hex;
			const pieceCid = "erc1271-sign-step";
			await registerEnvelopeOnly(ctx, pieceCid, [signerCommitment]);

			const ts = await latestBlockTimestamp(ctx.publicClient);

			await ctx.envelopeRegistry.write.registerEnvelopeSignature(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					contractSigner,
					signerCommitment,
					defaultViewerPrivy,
					`0x${"88".repeat(20)}`,
					ts,
					dummy1271Sig,
					`0x${"77".repeat(32)}`,
					1,
				],
				{ account: walletAccount(ctx.server) },
			);

			const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
			expect(await ctx.envelopeRegistry.read.allSigned([cidId])).to.equal(true);
		});

		it("registerEnvelopeSignature reverts when ERC-1271 signerWallet returns invalid magic", async () => {
			const ctx = await deployFullSystem();
			const contractSigner = await deployMock1271(true);

			const signerCommitment = `0x${"f4".repeat(32)}` as Hex;
			const pieceCid = "erc1271-bad-sign";
			await registerEnvelopeOnly(ctx, pieceCid, [signerCommitment]);

			await setMock1271Valid(contractSigner, false);
			const ts = await latestBlockTimestamp(ctx.publicClient);

			await assert.rejects(
				ctx.envelopeRegistry.write.registerEnvelopeSignature(
					[
						pieceCid,
						walletAccount(ctx.sender).address,
						contractSigner,
						signerCommitment,
						defaultViewerPrivy,
						`0x${"88".repeat(20)}`,
						ts,
						dummy1271Sig,
						`0x${"77".repeat(32)}`,
						1,
					],
					{ account: walletAccount(ctx.server) },
				),
			);
		});

		async function registerEnvelopeWithViewer(args: {
			ctx: Awaited<ReturnType<typeof deployFullSystem>>;
			pieceCid: string;
			signerC: Hex;
			viewerCommitment: Hex;
		}) {
			const { ctx, pieceCid, signerC, viewerCommitment } = args;
			const input = await buildRegisterEnvelopeInput(ctx, {
				pieceCid,
				requiredCommitments: [signerC],
				viewerEmailCommitments: [viewerCommitment],
			});
			await ctx.envelopeRegistry.write.registerEnvelope([input], {
				account: walletAccount(ctx.server),
			});
		}

		it("validateEnvelopeAckSignature returns true for ERC-1271 viewerWallet", async () => {
			const ctx = await deployFullSystem();
			const contractViewer = await deployMock1271(true);
			const viewerCommitment = `0x${"f5".repeat(32)}` as Hex;
			const signerC = `0x${"a2".repeat(32)}` as Hex;
			const pieceCid = "erc1271-ack-view";

			await registerEnvelopeWithViewer({
				ctx,
				pieceCid,
				signerC,
				viewerCommitment,
			});

			const ackTs = await latestBlockTimestamp(ctx.publicClient);
			const valid =
				await ctx.envelopeRegistry.read.validateEnvelopeAckSignature([
					pieceCid,
					walletAccount(ctx.sender).address,
					contractViewer,
					viewerCommitment,
					defaultViewerPrivy,
					ackTs,
					dummy1271Sig,
				]);
			expect(valid).to.equal(true);
		});

		it("validateEnvelopeAckSignature returns false when ERC-1271 viewer returns invalid magic", async () => {
			const ctx = await deployFullSystem();
			const contractViewer = await deployMock1271(true);
			const viewerCommitment = `0x${"f6".repeat(32)}` as Hex;
			const signerC = `0x${"a3".repeat(32)}` as Hex;
			const pieceCid = "erc1271-ack-invalid";

			await registerEnvelopeWithViewer({
				ctx,
				pieceCid,
				signerC,
				viewerCommitment,
			});

			await setMock1271Valid(contractViewer, false);
			const ackTs = await latestBlockTimestamp(ctx.publicClient);
			const valid =
				await ctx.envelopeRegistry.read.validateEnvelopeAckSignature([
					pieceCid,
					walletAccount(ctx.sender).address,
					contractViewer,
					viewerCommitment,
					defaultViewerPrivy,
					ackTs,
					dummy1271Sig,
				]);
			expect(valid).to.equal(false);
		});
	});
});
