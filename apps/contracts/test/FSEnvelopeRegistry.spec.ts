import assert from "node:assert/strict";
import { expect } from "chai";
import hre from "hardhat";
import type { Hex } from "viem";
import { keccak256, parseAbiItem, toBytes } from "viem";
import {
	buildRegisterEnvelopeInput,
	defaultDocumentSha256,
	defaultPlacement,
	defaultSenderAuth,
	defaultSenderEmail,
	deployFullSystem,
	registerEnvelopeOnly,
	registerEnvelopeSignatureStep,
	setOrgControllersForTest,
	testOrgIdCommitment,
	zeroOrg,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	mergeSortedCommitments,
	signProposeSignerReplacement,
	signRecallEnvelope,
	signRegisterEnvelope,
	signRegisterEnvelopeSignature,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

describe("FSEnvelopeRegistry", () => {
	it("sets deployer as owner at deployment", async () => {
		const ctx = await deployFullSystem();
		const owner = await ctx.envelopeRegistry.read.owner();
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
			ctx.envelopeRegistry.write.setServer([walletAccount(newServer).address], {
				account: walletAccount(ctx.server),
			}),
		);

		await ctx.envelopeRegistry.write.setServer(
			[walletAccount(newServer).address],
			{
				account: walletAccount(ctx.deployer),
			},
		);
		const server = await ctx.envelopeRegistry.read.server();
		expect(server.toLowerCase()).to.equal(
			walletAccount(newServer).address.toLowerCase(),
		);

		const logs = await ctx.publicClient.getLogs({
			address: ctx.envelopeRegistry.address,
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

		await ctx.envelopeRegistry.write.transferOwnership(
			[walletAccount(newOwner).address],
			{
				account: walletAccount(ctx.deployer),
			},
		);
		expect(
			(await ctx.envelopeRegistry.read.pendingOwner()).toLowerCase(),
		).to.equal(walletAccount(newOwner).address.toLowerCase());

		await ctx.envelopeRegistry.write.acceptOwnership({
			account: walletAccount(newOwner),
		});
		expect((await ctx.envelopeRegistry.read.owner()).toLowerCase()).to.equal(
			walletAccount(newOwner).address.toLowerCase(),
		);
	});

	it("computeEmailSignerCommitment: empty list yields zero bytes20", async () => {
		const ctx = await deployFullSystem();
		const z = await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
			[] as Hex[],
		]);
		expect(z).to.equal("0x0000000000000000000000000000000000000000");
	});

	it("computeEmailSignerCommitment: reverts on unsorted commitments", async () => {
		const ctx = await deployFullSystem();
		const hi = `0x${"02".repeat(32)}` as Hex;
		const lo = `0x${"01".repeat(32)}` as Hex;
		await assert.rejects(
			ctx.envelopeRegistry.read.computeEmailSignerCommitment([[hi, lo]]),
		);
	});

	it("registerEnvelope reverts when file already registered", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"b1".repeat(32)}` as Hex;
		const pieceCid = "dup-file";
		await registerEnvelopeOnly(ctx, pieceCid, [c]);
		const input = await buildRegisterEnvelopeInput(ctx, {
			pieceCid,
			requiredCommitments: [c],
		});
		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope([input], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("registerEnvelope reverts on invalid signature", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"c1".repeat(32)}` as Hex;
		const pieceCid = "bad-sig";
		const input = await buildRegisterEnvelopeInput(ctx, {
			pieceCid,
			requiredCommitments: [c],
			signature: `0x${"ab".repeat(65)}` as Hex,
		});
		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope([input], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("registerEnvelopeSignature reverts for invalid signer commitment", async () => {
		const ctx = await deployFullSystem();
		const onFile = `0x${"d1".repeat(32)}` as Hex;
		const notOnFile = `0x${"d2".repeat(32)}` as Hex;
		const pieceCid = "invalid-signer";
		await registerEnvelopeOnly(ctx, pieceCid, [onFile]);

		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		const reg = await ctx.envelopeRegistry.read.envelopeRegistrations([cidId]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const signSig = await signRegisterEnvelopeSignature({
			wallet: ctx.payout,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			sender: walletAccount(ctx.sender).address,
			signerEmailCommitment: notOnFile,
			authSubjectCommitment: defaultSenderAuth,
			dl3SignatureCommitment: `0x${"88".repeat(20)}` as Hex,
			completionsRoot: defaultPlacement,
			leafSchemaVersion: 1,
			signersCommitment: reg.signersCommitment,
			timestamp: ts,
		});
		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelopeSignature(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					walletAccount(ctx.payout).address,
					notOnFile,
					defaultSenderAuth,
					`0x${"88".repeat(20)}`,
					ts,
					signSig,
					defaultPlacement,
					1,
					[],
					[],
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerEnvelopeSignature reverts when already signed", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"e1".repeat(32)}` as Hex;
		const pieceCid = "double-sign";
		await registerEnvelopeOnly(ctx, pieceCid, [c]);
		const step = {
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: c,
		};
		await registerEnvelopeSignatureStep(step);
		await assert.rejects(registerEnvelopeSignatureStep(step));
	});

	it("two signers: completedAt set when both required sign", async () => {
		const ctx = await deployFullSystem();
		const ca = `0x${"01".repeat(32)}` as Hex;
		const cb = `0x${"02".repeat(32)}` as Hex;
		const pieceCid = "two-signers";

		await registerEnvelopeOnly(ctx, pieceCid, [ca, cb]);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: ca,
		});

		const clients = await hre.viem.getWalletClients();
		const signerB = clients[4];

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: signerB,
			signerEmailCommitment: cb,
		});

		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		expect(
			await ctx.envelopeRegistry.read.isEnvelopeComplete([cidId]),
		).to.equal(true);
		const reg = await ctx.envelopeRegistry.read.envelopeRegistrations([cidId]);
		expect(Number(reg.completedAt)).to.be.greaterThan(0);
	});

	it("registerEnvelope reverts when optional commitments non-empty", async () => {
		const ctx = await deployFullSystem();
		const required = `0x${"11".repeat(32)}` as Hex;
		const optional = `0x${"22".repeat(32)}` as Hex;
		const pieceCid = "optional-signer-rejected";
		await assert.rejects(
			registerEnvelopeOnly(ctx, pieceCid, [required], {
				optionalCommitments: [optional],
			}),
		);
	});

	it("sequential routing enforces signing order", async () => {
		const ctx = await deployFullSystem();
		const first = `0x${"31".repeat(32)}` as Hex;
		const second = `0x${"32".repeat(32)}` as Hex;
		const pieceCid = "sequential-order";
		await registerEnvelopeOnly(ctx, pieceCid, [first, second], {
			routingMode: 1,
			routingOrder: [first, second],
		});

		const seqRouting = {
			routingOrder: [first, second],
			quorumSet: [] as Hex[],
		};
		await assert.rejects(
			registerEnvelopeSignatureStep({
				ctx,
				pieceCid,
				senderAddr: walletAccount(ctx.sender).address,
				signerWallet: ctx.coSigner,
				signerEmailCommitment: second,
				...seqRouting,
			}),
		);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: first,
			...seqRouting,
		});
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.coSigner,
			signerEmailCommitment: second,
			...seqRouting,
		});
	});

	it("completedAt set when quorum N-of-M satisfied", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"41".repeat(32)}` as Hex;
		const b = `0x${"42".repeat(32)}` as Hex;
		const c = `0x${"43".repeat(32)}` as Hex;
		const pieceCid = "quorum-file";
		await registerEnvelopeOnly(ctx, pieceCid, [a, b, c], {
			quorumN: 2,
			quorumSet: [a, b, c],
		});

		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		expect(
			await ctx.envelopeRegistry.read.isEnvelopeComplete([cidId]),
		).to.equal(false);

		const quorumRouting = { routingOrder: [] as Hex[], quorumSet: [a, b, c] };
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: a,
			...quorumRouting,
		});
		expect(
			await ctx.envelopeRegistry.read.isEnvelopeComplete([cidId]),
		).to.equal(false);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: b,
			...quorumRouting,
		});
		expect(
			await ctx.envelopeRegistry.read.isEnvelopeComplete([cidId]),
		).to.equal(true);
	});

	it("proposeSignerReplacement instant path replaces commitment before sign", async () => {
		const ctx = await deployFullSystem();
		const oldC = `0x${"51".repeat(32)}` as Hex;
		const newC = `0x${"52".repeat(32)}` as Hex;
		const pieceCid = "propose-signer-instant";
		await registerEnvelopeOnly(ctx, pieceCid, [oldC]);

		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([[newC]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: oldC,
			newCommitment: newC,
			signersCommitmentAfter,
			timestamp: ts,
		});

		const senderAddr = walletAccount(ctx.sender).address;
		await ctx.envelopeRegistry.write.proposeSignerReplacement(
			[pieceCid, senderAddr, oldC, newC, ts, proposeSig, [], [], [], []],
			{ account: walletAccount(ctx.server) },
		);

		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.envelopeRegistry.read.isSigner([cidId, newC])).to.equal(
			true,
		);
		expect(await ctx.envelopeRegistry.read.isSigner([cidId, oldC])).to.equal(
			false,
		);

		const reg = await ctx.envelopeRegistry.read.envelopeRegistrations([cidId]);
		expect(reg.signersCommitment).to.equal(signersCommitmentAfter);
	});

	it("proposeSignerReplacement recomputes signersCommitment for multi-signer roster", async () => {
		const ctx = await deployFullSystem();
		const oldA = `0x${"41".repeat(32)}` as Hex;
		const oldB = `0x${"42".repeat(32)}` as Hex;
		const oldC = `0x${"43".repeat(32)}` as Hex;
		const newB = `0x${"44".repeat(32)}` as Hex;
		const pieceCid = "propose-multi-signer";
		await registerEnvelopeOnly(ctx, pieceCid, [oldA, oldB, oldC]);

		const expectedRoster = mergeSortedCommitments([oldA, oldC], [newB]);
		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
				expectedRoster,
			]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: oldB,
			newCommitment: newB,
			signersCommitmentAfter,
			timestamp: ts,
		});

		const senderAddr = walletAccount(ctx.sender).address;
		await ctx.envelopeRegistry.write.proposeSignerReplacement(
			[pieceCid, senderAddr, oldB, newB, ts, proposeSig, [], [], [], []],
			{ account: walletAccount(ctx.server) },
		);

		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		const reg = await ctx.envelopeRegistry.read.envelopeRegistrations([cidId]);
		expect(reg.signersCommitment).to.equal(signersCommitmentAfter);
	});

	it("proposeSignerReplacement pending then execute clears signatures", async () => {
		const ctx = await deployFullSystem();
		const vpC = `0x${"61".repeat(32)}` as Hex;
		const ceoC = `0x${"62".repeat(32)}` as Hex;
		const cfoC = `0x${"63".repeat(32)}` as Hex;
		const pieceCid = "propose-pending-execute";
		await registerEnvelopeOnly(ctx, pieceCid, [vpC, ceoC]);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: vpC,
		});

		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
				mergeSortedCommitments([vpC], [cfoC]),
			]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: ceoC,
			newCommitment: cfoC,
			signersCommitmentAfter,
			timestamp: ts,
		});
		const senderAddr = walletAccount(ctx.sender).address;
		await ctx.envelopeRegistry.write.proposeSignerReplacement(
			[pieceCid, senderAddr, ceoC, cfoC, ts, proposeSig, [], [], [], []],
			{ account: walletAccount(ctx.server) },
		);

		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.envelopeRegistry.read.hasSigned([cidId, vpC])).to.equal(
			true,
		);
		const pending = await ctx.envelopeRegistry.read.getPendingSignerReplacement(
			[cidId],
		);
		expect(pending[0]).to.equal(true);
		expect(pending[1]).to.equal(ceoC);
		expect(pending[2]).to.equal(cfoC);

		await assert.rejects(
			registerEnvelopeSignatureStep({
				ctx,
				pieceCid,
				senderAddr,
				signerWallet: ctx.payout,
				signerEmailCommitment: cfoC,
			}),
		);

		await ctx.envelopeRegistry.write.executeSignerReplacement(
			[pieceCid, senderAddr, [], []],
			{ account: walletAccount(ctx.server) },
		);

		expect(await ctx.envelopeRegistry.read.hasSigned([cidId, vpC])).to.equal(
			false,
		);
		expect(await ctx.envelopeRegistry.read.isSigner([cidId, cfoC])).to.equal(
			true,
		);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr,
			signerWallet: ctx.sender,
			signerEmailCommitment: vpC,
		});
		expect(await ctx.envelopeRegistry.read.hasSigned([cidId, vpC])).to.equal(
			true,
		);
	});

	it("proposeSignerReplacement reverts after old commitment signed", async () => {
		const ctx = await deployFullSystem();
		const oldC = `0x${"64".repeat(32)}` as Hex;
		const newC = `0x${"65".repeat(32)}` as Hex;
		const pieceCid = "propose-after-old-signed";
		await registerEnvelopeOnly(ctx, pieceCid, [oldC]);
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: oldC,
		});

		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([[newC]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: oldC,
			newCommitment: newC,
			signersCommitmentAfter,
			timestamp: ts,
		});

		const senderAddr = walletAccount(ctx.sender).address;
		await assert.rejects(
			ctx.envelopeRegistry.write.proposeSignerReplacement(
				[pieceCid, senderAddr, oldC, newC, ts, proposeSig, [], [], [], []],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerEnvelope reverts when signers exceed MAX 128", async () => {
		const ctx = await deployFullSystem();
		const commitments = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`signer-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];
		const timestamp = await latestBlockTimestamp(ctx.publicClient);

		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope(
				[
					{
						pieceCid: "too-many-signers",
						sender: walletAccount(ctx.sender).address,
						requiredCommitments: commitments,
						optionalCommitments: [],
						viewerEmailCommitments: [],
						senderEmailCommitment: defaultSenderEmail,
						senderAuthSubjectCommitment: defaultSenderAuth,
						orgIdCommitment: zeroOrg,
						routingMode: 0,
						routingOrder: [],
						quorumN: 0,
						quorumSet: [],
						timestamp,
						signature: `0x${"00".repeat(65)}` as Hex,
						placementCommitment: defaultPlacement,
						documentSha256: defaultDocumentSha256,
					},
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("cidIdentifier is keccak256 of piece CID string", async () => {
		const ctx = await deployFullSystem();
		const piece = "bafy-piece";
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([piece]);
		expect(cidId).to.equal(keccak256(toBytes(piece)));
	});

	it("registerEnvelope reverts when parallel mode has routingOrder", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"71".repeat(32)}` as Hex;
		const b = `0x${"72".repeat(32)}` as Hex;

		await assert.rejects(
			registerEnvelopeOnly(ctx, "parallel-routing", [a, b], {
				routingMode: 0,
				routingOrder: [a, b],
			}),
		);
	});

	it("registerEnvelope reverts when sequential routingOrder duplicates a signer", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"81".repeat(32)}` as Hex;
		const b = `0x${"82".repeat(32)}` as Hex;

		await assert.rejects(
			registerEnvelopeOnly(ctx, "dup-routing-order", [a, b], {
				routingMode: 1,
				routingOrder: [a, a],
			}),
		);
	});

	it("registerEnvelope reverts when viewers exceed MAX 128", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"73".repeat(32)}` as Hex;
		const viewers = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`viewer-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];

		await assert.rejects(
			registerEnvelopeOnly(ctx, "too-many-viewers", [signer], {
				viewerEmailCommitments: viewers,
			}),
		);
	});

	it("registerEnvelope reverts when routingOrder exceeds MAX 128", async () => {
		const ctx = await deployFullSystem();
		const commitments = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`route-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];

		await assert.rejects(
			registerEnvelopeOnly(ctx, "too-long-routing", commitments.slice(0, 1), {
				routingMode: 1,
				routingOrder: commitments,
			}),
		);
	});

	it("registerEnvelope reverts when quorumSet exceeds MAX 128", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"74".repeat(32)}` as Hex;
		const quorumSet = Array.from({ length: 129 }, (_, i) =>
			keccak256(toBytes(`quorum-${i.toString().padStart(4, "0")}`)),
		).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as Hex[];

		await assert.rejects(
			registerEnvelopeOnly(ctx, "too-long-quorum", [signer], {
				quorumN: 1,
				quorumSet,
			}),
		);
	});

	it("registerEnvelope reverts when optional commitments provided", async () => {
		const ctx = await deployFullSystem();
		const required = `0x${"75".repeat(32)}` as Hex;
		const optional = `0x${"76".repeat(32)}` as Hex;

		await assert.rejects(
			registerEnvelopeOnly(ctx, "optional-not-supported", [required], {
				optionalCommitments: [optional],
			}),
		);
	});

	it("registerEnvelope accepts signature within 24 hour validity window", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"78".repeat(32)}` as Hex;
		const pieceCid = "valid-24h-register";
		const signedAt = (await latestBlockTimestamp(ctx.publicClient)) - 86_399n;
		const signature = await signRegisterEnvelope({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			requiredCommitments: [signer],
			signersCommitment:
				await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
					[signer],
				]),
			placementCommitment: defaultPlacement,
			documentSha256: defaultDocumentSha256,
			senderEmailCommitment: defaultSenderEmail,
			senderAuthSubjectCommitment: defaultSenderAuth,
			timestamp: signedAt,
		});

		await ctx.envelopeRegistry.write.registerEnvelope(
			[
				{
					pieceCid,
					sender: walletAccount(ctx.sender).address,
					requiredCommitments: [signer],
					optionalCommitments: [],
					viewerEmailCommitments: [],
					senderEmailCommitment: defaultSenderEmail,
					senderAuthSubjectCommitment: defaultSenderAuth,
					orgIdCommitment: zeroOrg,
					routingMode: 0,
					routingOrder: [],
					quorumN: 0,
					quorumSet: [],
					timestamp: signedAt,
					signature,
					placementCommitment: defaultPlacement,
					documentSha256: defaultDocumentSha256,
				},
			],
			{ account: walletAccount(ctx.server) },
		);
	});

	it("registerEnvelope reverts when documentSha256 is zero", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"7a".repeat(32)}` as Hex;
		const pieceCid = "zero-document-hash";
		const input = await buildRegisterEnvelopeInput(ctx, {
			pieceCid,
			requiredCommitments: [signer],
			documentSha256: `0x${"00".repeat(32)}` as Hex,
		});
		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope([input], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("registerEnvelope reverts when signature exceeds 24 hour validity window", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"79".repeat(32)}` as Hex;
		const pieceCid = "expired-24h-register";
		const signedAt = (await latestBlockTimestamp(ctx.publicClient)) - 86_401n;
		const signature = await signRegisterEnvelope({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			requiredCommitments: [signer],
			signersCommitment:
				await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
					[signer],
				]),
			placementCommitment: defaultPlacement,
			documentSha256: defaultDocumentSha256,
			senderEmailCommitment: defaultSenderEmail,
			senderAuthSubjectCommitment: defaultSenderAuth,
			timestamp: signedAt,
		});

		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope(
				[
					{
						pieceCid,
						sender: walletAccount(ctx.sender).address,
						requiredCommitments: [signer],
						optionalCommitments: [],
						viewerEmailCommitments: [],
						senderEmailCommitment: defaultSenderEmail,
						senderAuthSubjectCommitment: defaultSenderAuth,
						orgIdCommitment: zeroOrg,
						routingMode: 0,
						routingOrder: [],
						quorumN: 0,
						quorumSet: [],
						timestamp: signedAt,
						signature,
						placementCommitment: defaultPlacement,
						documentSha256: defaultDocumentSha256,
					},
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerEnvelope reverts when signature is expired beyond 24h window", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"77".repeat(32)}` as Hex;
		const pieceCid = "expired-register";
		const staleTimestamp =
			(await latestBlockTimestamp(ctx.publicClient)) - 86_401n;
		const signature = await signRegisterEnvelope({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			requiredCommitments: [signer],
			signersCommitment:
				await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
					[signer],
				]),
			placementCommitment: defaultPlacement,
			documentSha256: defaultDocumentSha256,
			senderEmailCommitment: defaultSenderEmail,
			senderAuthSubjectCommitment: defaultSenderAuth,
			timestamp: staleTimestamp,
		});

		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope(
				[
					{
						pieceCid,
						sender: walletAccount(ctx.sender).address,
						requiredCommitments: [signer],
						optionalCommitments: [],
						viewerEmailCommitments: [],
						senderEmailCommitment: defaultSenderEmail,
						senderAuthSubjectCommitment: defaultSenderAuth,
						orgIdCommitment: zeroOrg,
						routingMode: 0,
						routingOrder: [],
						quorumN: 0,
						quorumSet: [],
						timestamp: staleTimestamp,
						signature,
						placementCommitment: defaultPlacement,
						documentSha256: defaultDocumentSha256,
					},
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerEnvelope reverts when signature timestamp is too far in the future", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"76".repeat(32)}` as Hex;
		const pieceCid = "future-register";
		const futureTimestamp =
			(await latestBlockTimestamp(ctx.publicClient)) + 360n;
		const signature = await signRegisterEnvelope({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			requiredCommitments: [signer],
			signersCommitment:
				await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
					[signer],
				]),
			placementCommitment: defaultPlacement,
			documentSha256: defaultDocumentSha256,
			senderEmailCommitment: defaultSenderEmail,
			senderAuthSubjectCommitment: defaultSenderAuth,
			timestamp: futureTimestamp,
		});

		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope(
				[
					{
						pieceCid,
						sender: walletAccount(ctx.sender).address,
						requiredCommitments: [signer],
						optionalCommitments: [],
						viewerEmailCommitments: [],
						senderEmailCommitment: defaultSenderEmail,
						senderAuthSubjectCommitment: defaultSenderAuth,
						orgIdCommitment: zeroOrg,
						routingMode: 0,
						routingOrder: [],
						quorumN: 0,
						quorumSet: [],
						timestamp: futureTimestamp,
						signature,
						placementCommitment: defaultPlacement,
						documentSha256: defaultDocumentSha256,
					},
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("validateEnvelopeAckSignature reverts when timestamp is too far in the future", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"75".repeat(32)}` as Hex;
		const viewerCommitment = `0x${"98".repeat(32)}` as Hex;
		const viewerAuth = `0x${"99".repeat(32)}` as Hex;
		const pieceCid = "future-ack";
		await registerEnvelopeOnly(ctx, pieceCid, [signer], {
			viewerEmailCommitments: [viewerCommitment],
		});

		const futureTimestamp =
			(await latestBlockTimestamp(ctx.publicClient)) + 360n;

		await assert.rejects(
			ctx.envelopeRegistry.read.validateEnvelopeAckSignature([
				pieceCid,
				walletAccount(ctx.sender).address,
				walletAccount(ctx.payout).address,
				viewerCommitment,
				viewerAuth,
				futureTimestamp,
				"0x",
			]),
		);
	});

	it("registerEnvelope reverts when caller is not server", async () => {
		const ctx = await deployFullSystem();
		const signer = `0x${"78".repeat(32)}` as Hex;
		const input = await buildRegisterEnvelopeInput(ctx, {
			pieceCid: "not-server",
			requiredCommitments: [signer],
		});

		await assert.rejects(
			ctx.envelopeRegistry.write.registerEnvelope([input], {
				account: walletAccount(ctx.sender),
			}),
		);
	});

	it("proposeSignerReplacement reverts on invalid sender signature", async () => {
		const ctx = await deployFullSystem();
		const oldC = `0x${"79".repeat(32)}` as Hex;
		const newC = `0x${"7a".repeat(32)}` as Hex;
		const pieceCid = "bad-propose-sig";
		await registerEnvelopeOnly(ctx, pieceCid, [oldC]);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const senderAddr = walletAccount(ctx.sender).address;
		await assert.rejects(
			ctx.envelopeRegistry.write.proposeSignerReplacement(
				[
					pieceCid,
					senderAddr,
					oldC,
					newC,
					ts,
					`0x${"00".repeat(65)}` as Hex,
					[],
					[],
					[],
					[],
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("proposeSignerReplacement reverts when quorum calldata does not match stored config", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"71".repeat(32)}` as Hex;
		const b = `0x${"72".repeat(32)}` as Hex;
		const newB = `0x${"73".repeat(32)}` as Hex;
		const pieceCid = "propose-bad-quorum-calldata";
		const quorumSet = [a, b];
		await registerEnvelopeOnly(ctx, pieceCid, [a, b], {
			quorumN: 2,
			quorumSet,
		});

		const signersCommitmentAfter =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
				mergeSortedCommitments([a], [newB]),
			]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const proposeSig = await signProposeSignerReplacement({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			oldCommitment: b,
			newCommitment: newB,
			signersCommitmentAfter,
			timestamp: ts,
		});
		const senderAddr = walletAccount(ctx.sender).address;
		const patchedQuorum = [a, newB];

		await assert.rejects(
			ctx.envelopeRegistry.write.proposeSignerReplacement(
				[
					pieceCid,
					senderAddr,
					b,
					newB,
					ts,
					proposeSig,
					[],
					[],
					[],
					patchedQuorum,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("recallEnvelope by sender voids envelope before required sign", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"81".repeat(32)}` as Hex;
		const pieceCid = "recall-sender";
		await registerEnvelopeOnly(ctx, pieceCid, [c]);
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		const senderAddr = walletAccount(ctx.sender).address;
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const recallSig = await signRecallEnvelope({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			orgIdCommitment: zeroOrg,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.recallEnvelope(
			[pieceCid, senderAddr, ts, recallSig],
			{ account: walletAccount(ctx.server) },
		);
		expect(
			await ctx.envelopeRegistry.read.isRevokedBeforeComplete([cidId]),
		).to.equal(true);
		const reg = await ctx.envelopeRegistry.read.envelopeRegistrations([cidId]);
		expect(Number(reg.revokedBeforeCompletedAt)).to.equal(Number(ts));
		await assert.rejects(
			registerEnvelopeSignatureStep({
				ctx,
				pieceCid,
				senderAddr,
				signerWallet: ctx.sender,
				signerEmailCommitment: c,
			}),
		);
	});

	it("recallEnvelope by org controller when synced on registry", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"82".repeat(32)}` as Hex;
		const pieceCid = "recall-org-controller";
		const controller = walletAccount(ctx.payout).address;
		await setOrgControllersForTest(ctx, testOrgIdCommitment, [controller]);
		await registerEnvelopeOnly(ctx, pieceCid, [c], {
			orgIdCommitment: testOrgIdCommitment,
		});
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const recallSig = await signRecallEnvelope({
			wallet: ctx.payout,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			orgIdCommitment: testOrgIdCommitment,
			timestamp: ts,
			recaller: controller,
		});
		await ctx.envelopeRegistry.write.recallEnvelope(
			[pieceCid, controller, ts, recallSig],
			{ account: walletAccount(ctx.server) },
		);
		expect(
			await ctx.envelopeRegistry.read.isRevokedBeforeComplete([cidId]),
		).to.equal(true);
	});

	it("recallEnvelope reverts for wallet not in org controller set", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"85".repeat(32)}` as Hex;
		const pieceCid = "recall-non-controller";
		await setOrgControllersForTest(ctx, testOrgIdCommitment, [
			walletAccount(ctx.payout).address,
		]);
		await registerEnvelopeOnly(ctx, pieceCid, [c], {
			orgIdCommitment: testOrgIdCommitment,
		});
		const intruder = walletAccount(ctx.coSigner).address;
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const recallSig = await signRecallEnvelope({
			wallet: ctx.coSigner,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			orgIdCommitment: testOrgIdCommitment,
			timestamp: ts,
			recaller: intruder,
		});
		await assert.rejects(
			ctx.envelopeRegistry.write.recallEnvelope(
				[pieceCid, intruder, ts, recallSig],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("recallEnvelope succeeds after partial required signature", async () => {
		const ctx = await deployFullSystem();
		const ca = `0x${"83".repeat(32)}` as Hex;
		const cb = `0x${"84".repeat(32)}` as Hex;
		const pieceCid = "recall-after-partial";
		await registerEnvelopeOnly(ctx, pieceCid, [ca, cb]);
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: ca,
		});
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		expect(
			await ctx.envelopeRegistry.read.isEnvelopeComplete([cidId]),
		).to.equal(false);
		const senderAddr = walletAccount(ctx.sender).address;
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const recallSig = await signRecallEnvelope({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			orgIdCommitment: zeroOrg,
			timestamp: ts,
		});
		await ctx.envelopeRegistry.write.recallEnvelope(
			[pieceCid, senderAddr, ts, recallSig],
			{ account: walletAccount(ctx.server) },
		);
		expect(
			await ctx.envelopeRegistry.read.isRevokedBeforeComplete([cidId]),
		).to.equal(true);
	});

	it("recallEnvelope reverts after envelope complete", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"85".repeat(32)}` as Hex;
		const pieceCid = "recall-after-complete";
		await registerEnvelopeOnly(ctx, pieceCid, [c]);
		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: c,
		});
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		expect(
			await ctx.envelopeRegistry.read.isEnvelopeComplete([cidId]),
		).to.equal(true);
		const senderAddr = walletAccount(ctx.sender).address;
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const recallSig = await signRecallEnvelope({
			wallet: ctx.sender,
			envelopeRegistryAddress: ctx.envelopeRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			orgIdCommitment: zeroOrg,
			timestamp: ts,
		});
		await assert.rejects(
			ctx.envelopeRegistry.write.recallEnvelope(
				[pieceCid, senderAddr, ts, recallSig],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	describe("setOrgControllers", () => {
		it("getOrgControllers returns synced wallets", async () => {
			const ctx = await deployFullSystem();
			const controller = walletAccount(ctx.payout).address;
			await setOrgControllersForTest(ctx, testOrgIdCommitment, [controller]);
			const list = await ctx.envelopeRegistry.read.getOrgControllers([
				testOrgIdCommitment,
			]);
			expect(list.map((a) => a.toLowerCase())).to.deep.equal([
				controller.toLowerCase(),
			]);
			expect(
				await ctx.envelopeRegistry.read.isOrgController([
					testOrgIdCommitment,
					controller,
				]),
			).to.equal(true);
		});

		it("reverts ZeroOrgIdCommitment for zero org id", async () => {
			const ctx = await deployFullSystem();
			await assert.rejects(
				ctx.envelopeRegistry.write.setOrgControllers(
					[zeroOrg, [walletAccount(ctx.payout).address]],
					{ account: walletAccount(ctx.server) },
				),
			);
		});

		it("reverts DuplicateOrgController for duplicate wallets", async () => {
			const ctx = await deployFullSystem();
			const wallet = walletAccount(ctx.payout).address;
			await assert.rejects(
				ctx.envelopeRegistry.write.setOrgControllers(
					[testOrgIdCommitment, [wallet, wallet]],
					{ account: walletAccount(ctx.server) },
				),
			);
		});

		it("reverts ExceedsMaxOrgControllers when over 64 wallets", async () => {
			const ctx = await deployFullSystem();
			const wallets = Array.from({ length: 65 }, (_, i) => {
				const hex = (i + 1).toString(16).padStart(40, "0");
				return `0x${hex}` as `0x${string}`;
			});
			await assert.rejects(
				ctx.envelopeRegistry.write.setOrgControllers(
					[testOrgIdCommitment, wallets],
					{ account: walletAccount(ctx.server) },
				),
			);
		});

		it("empty wallets clears on-chain controller set", async () => {
			const ctx = await deployFullSystem();
			const controller = walletAccount(ctx.payout).address;
			await setOrgControllersForTest(ctx, testOrgIdCommitment, [controller]);
			await ctx.envelopeRegistry.write.setOrgControllers(
				[testOrgIdCommitment, []],
				{ account: walletAccount(ctx.server) },
			);
			expect(
				await ctx.envelopeRegistry.read.isOrgController([
					testOrgIdCommitment,
					controller,
				]),
			).to.equal(false);
			expect(
				(
					await ctx.envelopeRegistry.read.getOrgControllers([
						testOrgIdCommitment,
					])
				).length,
			).to.equal(0);
		});
	});

	it("rosterSignedCount tracks signed roster members", async () => {
		const ctx = await deployFullSystem();
		const a = `0x${"7b".repeat(32)}` as Hex;
		const b = `0x${"7c".repeat(32)}` as Hex;
		const pieceCid = "roster-count";
		await registerEnvelopeOnly(ctx, pieceCid, [a, b]);
		const cidId = await ctx.envelopeRegistry.read.cidIdentifier([pieceCid]);
		expect(await ctx.envelopeRegistry.read.rosterSignedCount([cidId])).to.equal(
			0,
		);

		await registerEnvelopeSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.sender,
			signerEmailCommitment: a,
		});
		expect(await ctx.envelopeRegistry.read.rosterSignedCount([cidId])).to.equal(
			1,
		);
	});
});
