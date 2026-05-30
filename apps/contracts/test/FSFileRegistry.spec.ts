import assert from "node:assert/strict";
import { expect } from "chai";
import hre from "hardhat";
import type { Hex } from "viem";
import { keccak256, parseAbiItem, toBytes } from "viem";
import {
	buildRegisterFileInput,
	defaultPlacement,
	defaultSenderEmail,
	defaultSenderPrivy,
	deployFullSystem,
	registerFileOnly,
	registerFileSignatureStep,
	zeroOrg,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	mergeSortedCommitments,
	signAmendSigner,
	signRegisterFile,
	signRegisterFileSignature,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

describe("FSFileRegistry", () => {
	it("sets deployer as owner at deployment", async () => {
		const ctx = await deployFullSystem();
		const owner = await ctx.fileRegistry.read.owner();
		expect(owner.toLowerCase()).to.equal(
			walletAccount(ctx.deployer).address.toLowerCase(),
		);
	});

	it("only owner can rotate server address", async () => {
		const ctx = await deployFullSystem();
		const clients = await hre.viem.getWalletClients();
		const newServer = clients[6];
		if (!newServer)
			throw new Error("expected additional Hardhat wallet client");

		await assert.rejects(
			ctx.fileRegistry.write.setServer([walletAccount(newServer).address], {
				account: walletAccount(ctx.server),
			}),
		);

		await ctx.fileRegistry.write.setServer([walletAccount(newServer).address], {
			account: walletAccount(ctx.deployer),
		});
		const server = await ctx.fileRegistry.read.server();
		expect(server.toLowerCase()).to.equal(
			walletAccount(newServer).address.toLowerCase(),
		);

		const logs = await ctx.publicClient.getLogs({
			address: ctx.fileRegistry.address,
			fromBlock: "earliest",
			event: parseAbiItem(
				"event ServerUpdated(address indexed previousServer, address indexed newServer, address indexed changedBy)",
			),
		});
		expect(logs.length).to.be.greaterThan(0);
	});

	it("supports two-step ownership transfer", async () => {
		const ctx = await deployFullSystem();
		const clients = await hre.viem.getWalletClients();
		const newOwner = clients[6];
		if (!newOwner) throw new Error("expected additional Hardhat wallet client");

		await ctx.fileRegistry.write.transferOwnership(
			[walletAccount(newOwner).address],
			{
				account: walletAccount(ctx.deployer),
			},
		);
		expect((await ctx.fileRegistry.read.pendingOwner()).toLowerCase()).to.equal(
			walletAccount(newOwner).address.toLowerCase(),
		);

		await ctx.fileRegistry.write.acceptOwnership({
			account: walletAccount(newOwner),
		});
		expect((await ctx.fileRegistry.read.owner()).toLowerCase()).to.equal(
			walletAccount(newOwner).address.toLowerCase(),
		);
	});

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

	it("registerFile reverts when file already registered", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"b1".repeat(32)}` as Hex;
		const pieceCid = "dup-file";
		await registerFileOnly(ctx, pieceCid, [c]);
		const input = await buildRegisterFileInput(ctx, {
			pieceCid,
			requiredCommitments: [c],
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFile([input], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("registerFile reverts on invalid signature", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"c1".repeat(32)}` as Hex;
		const pieceCid = "bad-sig";
		const input = await buildRegisterFileInput(ctx, {
			pieceCid,
			requiredCommitments: [c],
			signature: `0x${"ab".repeat(65)}` as Hex,
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFile([input], {
				account: walletAccount(ctx.server),
			}),
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

	it("two signers: allSigned when both required sign", async () => {
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
		expect(await ctx.fileRegistry.read.allRequiredSigned([cidId])).to.equal(
			true,
		);
		expect(await ctx.fileRegistry.read.allSigned([cidId])).to.equal(true);
	});

	it("optional signers: allRequiredSigned before optional signs", async () => {
		const ctx = await deployFullSystem();
		const required = `0x${"11".repeat(32)}` as Hex;
		const optional = `0x${"22".repeat(32)}` as Hex;
		const pieceCid = "optional-signer";
		await registerFileOnly(ctx, pieceCid, [required], {
			optionalCommitments: [optional],
		});

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: required,
		});

		const cidId = await ctx.fileRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.fileRegistry.read.allRequiredSigned([cidId])).to.equal(
			true,
		);
		expect(await ctx.fileRegistry.read.allSigned([cidId])).to.equal(false);

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: optional,
		});
		expect(await ctx.fileRegistry.read.allSigned([cidId])).to.equal(true);
	});

	it("sequential routing enforces signing order", async () => {
		const ctx = await deployFullSystem();
		const first = `0x${"31".repeat(32)}` as Hex;
		const second = `0x${"32".repeat(32)}` as Hex;
		const pieceCid = "sequential-order";
		await registerFileOnly(ctx, pieceCid, [first, second], {
			routingMode: 1,
			routingOrder: [first, second],
		});

		await assert.rejects(
			registerFileSignatureStep({
				ctx,
				pieceCid,
				senderAddr: walletAccount(ctx.sender).address,
				signerWallet: ctx.coSigner,
				signerEmailCommitment: second,
			}),
		);

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: first,
		});
		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: second,
		});
	});

	it("quorumMet returns true when quorum N-of-M satisfied", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"41".repeat(32)}` as Hex;
		const b = `0x${"42".repeat(32)}` as Hex;
		const c = `0x${"43".repeat(32)}` as Hex;
		const pieceCid = "quorum-file";
		await registerFileOnly(ctx, pieceCid, [a, b, c], {
			quorumN: 2,
			quorumSet: [a, b, c],
		});

		const cidId = await ctx.fileRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.fileRegistry.read.quorumMet([cidId])).to.equal(false);

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: a,
		});
		expect(await ctx.fileRegistry.read.quorumMet([cidId])).to.equal(false);

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: b,
		});
		expect(await ctx.fileRegistry.read.quorumMet([cidId])).to.equal(true);
	});

	it("amendSigner replaces commitment before sign", async () => {
		const ctx = await deployFullSystem();
		const oldC = `0x${"51".repeat(32)}` as Hex;
		const newC = `0x${"52".repeat(32)}` as Hex;
		const pieceCid = "amend-signer";
		await registerFileOnly(ctx, pieceCid, [oldC]);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const amendSig = await signAmendSigner({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: oldC,
			newCommitment: newC,
			timestamp: ts,
			nonce,
		});

		await ctx.fileRegistry.write.amendSigner(
			[pieceCid, oldC, newC, ts, amendSig],
			{ account: walletAccount(ctx.server) },
		);

		const cidId = await ctx.fileRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.fileRegistry.read.isSigner([cidId, newC])).to.equal(true);
		expect(await ctx.fileRegistry.read.isSigner([cidId, oldC])).to.equal(false);

		const reg = await ctx.fileRegistry.read.fileRegistrations([cidId]);
		const expectedCommitment =
			await ctx.fileRegistry.read.computeEmailSignerCommitment([[newC]]);
		expect(reg.signersCommitment).to.equal(expectedCommitment);
	});

	it("amendSigner recomputes signersCommitment for multi-signer roster", async () => {
		const ctx = await deployFullSystem();
		const oldA = `0x${"41".repeat(32)}` as Hex;
		const oldB = `0x${"42".repeat(32)}` as Hex;
		const oldC = `0x${"43".repeat(32)}` as Hex;
		const newB = `0x${"44".repeat(32)}` as Hex;
		const pieceCid = "amend-multi-signer";
		await registerFileOnly(ctx, pieceCid, [oldA, oldB, oldC]);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const amendSig = await signAmendSigner({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: oldB,
			newCommitment: newB,
			timestamp: ts,
			nonce,
		});

		await ctx.fileRegistry.write.amendSigner(
			[pieceCid, oldB, newB, ts, amendSig],
			{ account: walletAccount(ctx.server) },
		);

		const cidId = await ctx.fileRegistry.read.cidIdentifier([pieceCid]);
		const expectedRoster = mergeSortedCommitments([oldA, oldC], [newB]);
		const expectedCommitment =
			await ctx.fileRegistry.read.computeEmailSignerCommitment([
				expectedRoster,
			]);
		const reg = await ctx.fileRegistry.read.fileRegistrations([cidId]);
		expect(reg.signersCommitment).to.equal(expectedCommitment);
	});

	it("amendSigner reverts after old commitment signed", async () => {
		const ctx = await deployFullSystem();
		const oldC = `0x${"61".repeat(32)}` as Hex;
		const newC = `0x${"62".repeat(32)}` as Hex;
		const pieceCid = "amend-after-sign";
		await registerFileOnly(ctx, pieceCid, [oldC]);
		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: oldC,
		});

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const amendSig = await signAmendSigner({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: oldC,
			newCommitment: newC,
			timestamp: ts,
			nonce,
		});

		await assert.rejects(
			ctx.fileRegistry.write.amendSigner([pieceCid, oldC, newC, ts, amendSig], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("registerFile reverts when signers exceed MAX 128", async () => {
		const ctx = await deployFullSystem();
		const commitments = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`signer-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];
		const timestamp = await latestBlockTimestamp(ctx.publicClient);

		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					{
						pieceCid: "too-many-signers",
						sender: walletAccount(ctx.sender).address,
						requiredCommitments: commitments,
						optionalCommitments: [],
						viewerEmailCommitments: [],
						senderEmailCommitment: defaultSenderEmail,
						senderPrivySubjectCommitment: defaultSenderPrivy,
						orgIdCommitment: zeroOrg,
						routingMode: 0,
						routingOrder: [],
						quorumN: 0,
						quorumSet: [],
						timestamp,
						signature: `0x${"00".repeat(65)}` as Hex,
						placementCommitment: defaultPlacement,
					},
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("cidIdentifier is keccak256 of piece CID string", async () => {
		const ctx = await deployFullSystem();
		const piece = "bafy-piece";
		const cidId = await ctx.fileRegistry.read.cidIdentifier([piece]);
		expect(cidId).to.equal(keccak256(toBytes(piece)));
	});

	it("registerFile reverts when parallel mode has routingOrder", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"71".repeat(32)}` as Hex;
		const b = `0x${"72".repeat(32)}` as Hex;

		await assert.rejects(
			registerFileOnly(ctx, "parallel-routing", [a, b], {
				routingMode: 0,
				routingOrder: [a, b],
			}),
		);
	});

	it("registerFile reverts when sequential routingOrder duplicates a signer", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"81".repeat(32)}` as Hex;
		const b = `0x${"82".repeat(32)}` as Hex;

		await assert.rejects(
			registerFileOnly(ctx, "dup-routing-order", [a, b], {
				routingMode: 1,
				routingOrder: [a, a],
			}),
		);
	});

	it("registerFile reverts when viewers exceed MAX 128", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"73".repeat(32)}` as Hex;
		const viewers = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`viewer-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];

		await assert.rejects(
			registerFileOnly(ctx, "too-many-viewers", [signer], {
				viewerEmailCommitments: viewers,
			}),
		);
	});

	it("registerFile reverts when routingOrder exceeds MAX 128", async () => {
		const ctx = await deployFullSystem();
		const commitments = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`route-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];

		await assert.rejects(
			registerFileOnly(ctx, "too-long-routing", commitments.slice(0, 1), {
				routingMode: 1,
				routingOrder: commitments,
			}),
		);
	});

	it("registerFile reverts when quorumSet exceeds MAX 128", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"74".repeat(32)}` as Hex;
		const quorumSet = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`quorum-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];

		await assert.rejects(
			registerFileOnly(ctx, "too-long-quorum", [signer], {
				quorumN: 1,
				quorumSet,
			}),
		);
	});

	it("registerFile reverts when required and optional overlap", async () => {
		const ctx = await deployFullSystem();
		const shared = `0x${"75".repeat(32)}` as Hex;
		const optional = `0x${"76".repeat(32)}` as Hex;

		await assert.rejects(
			registerFileOnly(ctx, "overlap-signers", [shared], {
				optionalCommitments: [shared, optional],
			}),
		);
	});

	it("registerFile reverts when signature is expired", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"77".repeat(32)}` as Hex;
		const pieceCid = "expired-register";
		const staleTimestamp =
			(await latestBlockTimestamp(ctx.publicClient)) - 200n;
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const signature = await signRegisterFile({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			requiredCommitments: [signer],
			signersCommitment:
				await ctx.fileRegistry.read.computeEmailSignerCommitment([[signer]]),
			placementCommitment: defaultPlacement,
			senderEmailCommitment: defaultSenderEmail,
			senderPrivySubjectCommitment: defaultSenderPrivy,
			timestamp: staleTimestamp,
			nonce,
		});

		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					{
						pieceCid,
						sender: walletAccount(ctx.sender).address,
						requiredCommitments: [signer],
						optionalCommitments: [],
						viewerEmailCommitments: [],
						senderEmailCommitment: defaultSenderEmail,
						senderPrivySubjectCommitment: defaultSenderPrivy,
						orgIdCommitment: zeroOrg,
						routingMode: 0,
						routingOrder: [],
						quorumN: 0,
						quorumSet: [],
						timestamp: staleTimestamp,
						signature,
						placementCommitment: defaultPlacement,
					},
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFile reverts when signature timestamp is too far in the future", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"76".repeat(32)}` as Hex;
		const pieceCid = "future-register";
		const futureTimestamp =
			(await latestBlockTimestamp(ctx.publicClient)) + 360n;
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const signature = await signRegisterFile({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			requiredCommitments: [signer],
			signersCommitment:
				await ctx.fileRegistry.read.computeEmailSignerCommitment([[signer]]),
			placementCommitment: defaultPlacement,
			senderEmailCommitment: defaultSenderEmail,
			senderPrivySubjectCommitment: defaultSenderPrivy,
			timestamp: futureTimestamp,
			nonce,
		});

		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					{
						pieceCid,
						sender: walletAccount(ctx.sender).address,
						requiredCommitments: [signer],
						optionalCommitments: [],
						viewerEmailCommitments: [],
						senderEmailCommitment: defaultSenderEmail,
						senderPrivySubjectCommitment: defaultSenderPrivy,
						orgIdCommitment: zeroOrg,
						routingMode: 0,
						routingOrder: [],
						quorumN: 0,
						quorumSet: [],
						timestamp: futureTimestamp,
						signature,
						placementCommitment: defaultPlacement,
					},
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("validateFileAckSignature reverts when timestamp is too far in the future", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"75".repeat(32)}` as Hex;
		const viewerCommitment = `0x${"98".repeat(32)}` as Hex;
		const viewerPrivy = `0x${"99".repeat(32)}` as Hex;
		const pieceCid = "future-ack";
		await registerFileOnly(ctx, pieceCid, [signer], {
			viewerEmailCommitments: [viewerCommitment],
		});

		const futureTimestamp =
			(await latestBlockTimestamp(ctx.publicClient)) + 360n;

		await assert.rejects(
			ctx.fileRegistry.read.validateFileAckSignature([
				pieceCid,
				walletAccount(ctx.sender).address,
				walletAccount(ctx.payout).address,
				viewerCommitment,
				viewerPrivy,
				futureTimestamp,
				"0x",
			]),
		);
	});

	it("registerFile reverts when caller is not server", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"78".repeat(32)}` as Hex;
		const input = await buildRegisterFileInput(ctx, {
			pieceCid: "not-server",
			requiredCommitments: [signer],
		});

		await assert.rejects(
			ctx.fileRegistry.write.registerFile([input], {
				account: walletAccount(ctx.sender),
			}),
		);
	});

	it("amendSigner reverts on invalid sender signature", async () => {
		const ctx = await deployFullSystem();
		const oldC = `0x${"79".repeat(32)}` as Hex;
		const newC = `0x${"7a".repeat(32)}` as Hex;
		const pieceCid = "bad-amend-sig";
		await registerFileOnly(ctx, pieceCid, [oldC]);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		await assert.rejects(
			ctx.fileRegistry.write.amendSigner(
				[pieceCid, oldC, newC, ts, `0x${"00".repeat(65)}` as Hex],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("rosterSignedCount tracks signed roster members", async () => {
		const ctx = await deployFullSystem();
		const required = `0x${"7b".repeat(32)}` as Hex;
		const optional = `0x${"7c".repeat(32)}` as Hex;
		const pieceCid = "roster-count";
		await registerFileOnly(ctx, pieceCid, [required], {
			optionalCommitments: [optional],
		});
		const cidId = await ctx.fileRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.fileRegistry.read.rosterSignedCount([cidId])).to.equal(0);

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: required,
		});
		expect(await ctx.fileRegistry.read.rosterSignedCount([cidId])).to.equal(1);
	});
});
