import { expect } from "chai";
import type { Hex } from "viem";
import { keccak256, toBytes } from "viem";
import {
	clearRegistryEip712DomainCache,
	eip712signature,
	getContracts,
	readRegistryEip712Domain,
} from "../exports.js";
import {
	defaultDocumentSha256,
	defaultPlacement,
	defaultSenderAuth,
	defaultSenderEmail,
	deployFullSystem,
	zeroOrg,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import { hashCommitments } from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

describe("eip712signature service", () => {
	beforeEach(() => {
		clearRegistryEip712DomainCache();
	});

	it("reads on-chain EIP-712 domain version 1 from deployed registry", async () => {
		const ctx = await deployFullSystem();
		const [, name, version] = await ctx.envelopeRegistry.read.eip712Domain();
		expect(name).to.equal("FSEnvelopeRegistry");
		expect(version).to.equal("1");

		const contracts = getContracts({ client: ctx.sender, chainKey: "local" });
		const domain = await readRegistryEip712Domain(
			contracts,
			ctx.envelopeRegistry.address,
		);
		expect(domain.version).to.equal("1");
		expect(domain.verifyingContract.toLowerCase()).to.equal(
			ctx.envelopeRegistry.address.toLowerCase(),
		);
	});

	it("signs RegisterEnvelope via eip712signature and validates on-chain", async () => {
		const ctx = await deployFullSystem();
		const contracts = getContracts({ client: ctx.sender, chainKey: "local" });
		const pieceCid = "filosign-eip712-service-test";
		const cidIdentifier = keccak256(toBytes(pieceCid));
		const requiredCommitments = [`0x${"aa".repeat(32)}` as Hex];
		const optionalCommitments: Hex[] = [];
		const routingOrder: Hex[] = [];
		const quorumSet: Hex[] = [];
		const timestamp = await latestBlockTimestamp(ctx.publicClient);
		const signersCommitment =
			await ctx.envelopeRegistry.read.computeEmailSignerCommitment([
				requiredCommitments,
			]);
		const viewersCommitment =
			"0x0000000000000000000000000000000000000000" as Hex;
		const sender = walletAccount(ctx.sender).address;

		const signature = await eip712signature(
			contracts,
			"FSEnvelopeRegistry",
			{
				types: {
					RegisterEnvelope: [
						{ name: "cidIdentifier", type: "bytes32" },
						{ name: "sender", type: "address" },
						{ name: "signersCommitment", type: "bytes20" },
						{ name: "viewersCommitment", type: "bytes20" },
						{ name: "placementCommitment", type: "bytes32" },
						{ name: "documentSha256", type: "bytes32" },
						{ name: "senderEmailCommitment", type: "bytes32" },
						{ name: "senderAuthSubjectCommitment", type: "bytes32" },
						{ name: "orgIdCommitment", type: "bytes32" },
						{ name: "requiredCommitmentsHash", type: "bytes32" },
						{ name: "optionalCommitmentsHash", type: "bytes32" },
						{ name: "routingMode", type: "uint8" },
						{ name: "routingOrderHash", type: "bytes32" },
						{ name: "quorumN", type: "uint8" },
						{ name: "quorumSetHash", type: "bytes32" },
						{ name: "timestamp", type: "uint256" },
					],
				},
				primaryType: "RegisterEnvelope",
				message: {
					cidIdentifier,
					sender,
					signersCommitment,
					viewersCommitment,
					placementCommitment: defaultPlacement,
					documentSha256: defaultDocumentSha256,
					senderEmailCommitment: defaultSenderEmail,
					senderAuthSubjectCommitment: defaultSenderAuth,
					orgIdCommitment: zeroOrg,
					requiredCommitmentsHash: hashCommitments(requiredCommitments),
					optionalCommitmentsHash: hashCommitments(optionalCommitments),
					routingMode: 0,
					routingOrderHash: hashCommitments(routingOrder),
					quorumN: 0,
					quorumSetHash: hashCommitments(quorumSet),
					timestamp,
				},
			},
			{ verifyingContract: ctx.envelopeRegistry.address },
		);

		const valid =
			await ctx.envelopeRegistry.read.validateEnvelopeRegistrationSignature([
				{
					pieceCid,
					sender,
					requiredCommitments,
					optionalCommitments,
					viewerEmailCommitments: [],
					senderEmailCommitment: defaultSenderEmail,
					senderAuthSubjectCommitment: defaultSenderAuth,
					orgIdCommitment: zeroOrg,
					routingMode: 0,
					routingOrder,
					quorumN: 0,
					quorumSet,
					timestamp,
					signature,
					placementCommitment: defaultPlacement,
					documentSha256: defaultDocumentSha256,
				},
			]);

		expect(valid).to.equal(true);
	});
});
