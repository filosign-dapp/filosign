import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "chai";
import type { Hex } from "viem";
import { buildRegisterEnvelopeInput, deployFullSystem } from "./fixtures";
import { walletAccount } from "./helpers/walletAccount";

type StorageSlot = {
	label: string;
	slot: string;
	offset: number;
	type: string;
};

function loadRegistryStorageLayout(): {
	pending: StorageSlot[];
	envelope: StorageSlot[];
} {
	const buildInfoDir = join(import.meta.dirname, "../artifacts/build-info");
	const buildInfoFile = readdirSync(buildInfoDir).sort().at(-1);
	if (!buildInfoFile) {
		throw new Error("Missing build-info; run hardhat compile");
	}
	const buildInfo = JSON.parse(
		readFileSync(join(buildInfoDir, buildInfoFile), "utf8"),
	) as {
		output: {
			contracts: Record<
				string,
				Record<
					string,
					{
						storageLayout?: {
							types: Record<string, { members?: StorageSlot[] }>;
						};
					}
				>
			>;
		};
	};
	const layout =
		buildInfo.output.contracts["src/FSEnvelopeRegistry.sol"]?.FSEnvelopeRegistry
			?.storageLayout;
	if (!layout?.types) {
		throw new Error("FSEnvelopeRegistry storageLayout missing; run compile");
	}

	const pending = Object.values(layout.types).find((t) =>
		t.members?.some((m) => m.label === "signersCommitmentAfter"),
	);
	const envelope = Object.values(layout.types).find((t) =>
		t.members?.some((m) => m.label === "signerRoster"),
	);
	if (!pending?.members || !envelope?.members) {
		throw new Error("Expected nested struct layouts in build-info");
	}
	return { pending: pending.members, envelope: envelope.members };
}

describe("FSEnvelopeRegistry storage layout and register gas", () => {
	it("PendingSignerReplacement packs recaller with proposedAt and active", () => {
		const { pending } = loadRegistryStorageLayout();
		const byLabel = Object.fromEntries(pending.map((m) => [m.label, m]));

		expect(byLabel.recaller?.slot).to.equal(byLabel.proposedAt?.slot);
		expect(byLabel.recaller?.slot).to.equal(byLabel.active?.slot);
		expect(byLabel.routingOrderHashAfter?.slot).to.not.equal(
			byLabel.recaller?.slot,
		);
		expect(Number(byLabel.signersCommitmentAfter?.slot)).to.equal(5);
	});

	it("EnvelopeRegistration keeps mappings after signerRoster", () => {
		const { envelope } = loadRegistryStorageLayout();
		const byLabel = Object.fromEntries(envelope.map((m) => [m.label, m]));

		expect(Number(byLabel.signerRoster?.slot)).to.be.lessThan(
			Number(byLabel.viewerEmailRegistered?.slot),
		);
		expect(byLabel.timestamp?.type).to.equal("t_uint48");
		expect(Number(byLabel.signatures?.slot)).to.equal(15);
	});

	it("registerEnvelope gas baseline (1 signer)", async () => {
		const ctx = await deployFullSystem();
		const pieceCid = `bafy${"a".repeat(52)}`;
		const commitment = `0x${"11".repeat(32)}` as Hex;

		const input = await buildRegisterEnvelopeInput(ctx, {
			pieceCid,
			requiredCommitments: [commitment],
		});
		const hash = await ctx.envelopeRegistry.write.registerEnvelope([input], {
			account: walletAccount(ctx.server),
		});
		const receipt = await ctx.publicClient.waitForTransactionReceipt({ hash });

		expect(Number(receipt.gasUsed)).to.be.lessThan(2_500_000);
		expect(Number(receipt.gasUsed)).to.be.greaterThan(200_000);
	});

	it("registerEnvelope gas scales reasonably with roster size", async () => {
		const ctx = await deployFullSystem();
		const oneCid = `bafy${"b".repeat(52)}`;
		const threeCid = `bafy${"c".repeat(52)}`;
		const commitments = [
			`0x${"22".repeat(32)}`,
			`0x${"33".repeat(32)}`,
			`0x${"44".repeat(32)}`,
		] as Hex[];

		const oneInput = await buildRegisterEnvelopeInput(ctx, {
			pieceCid: oneCid,
			requiredCommitments: [commitments[0]],
		});
		const oneHash = await ctx.envelopeRegistry.write.registerEnvelope(
			[oneInput],
			{ account: walletAccount(ctx.server) },
		);
		const oneReceipt = await ctx.publicClient.waitForTransactionReceipt({
			hash: oneHash,
		});

		const threeInput = await buildRegisterEnvelopeInput(ctx, {
			pieceCid: threeCid,
			requiredCommitments: commitments,
		});
		const threeHash = await ctx.envelopeRegistry.write.registerEnvelope(
			[threeInput],
			{ account: walletAccount(ctx.server) },
		);
		const threeReceipt = await ctx.publicClient.waitForTransactionReceipt({
			hash: threeHash,
		});

		const delta = Number(threeReceipt.gasUsed) - Number(oneReceipt.gasUsed);
		expect(delta).to.be.lessThan(400_000);
		expect(delta).to.be.greaterThan(50_000);
	});
});
