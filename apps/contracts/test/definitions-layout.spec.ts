import { existsSync } from "node:fs";
import { expect } from "chai";
import { getHistoricalAbi } from "../definitions/index.js";
import {
	parseDeploymentManifest,
	parseLatestPointer,
} from "../definitions/schema.js";
import {
	abiRefFromAbi,
	normalizeAbiJson,
} from "../scripts/lib/definitions/abi-store.js";

describe("definitions layout", () => {
	it("parses latest pointer and deployment manifest when local is deployed", async () => {
		const latestPath = "definitions/chains/local/latest.json";
		if (!existsSync(latestPath)) {
			return;
		}

		const pointer = parseLatestPointer(await Bun.file(latestPath).json());
		expect(pointer.deploymentId).to.be.a("string").and.not.empty;

		const manifest = parseDeploymentManifest(
			await Bun.file(
				`definitions/chains/local/deployments/${pointer.deploymentId}/manifest.json`,
			).json(),
		);
		expect(manifest.deploymentId).to.equal(pointer.deploymentId);
		expect(manifest.chainId).to.equal(31337);
		expect(manifest.contracts.FSEnvelopeRegistry.address).to.match(/^0x/i);
		expect(manifest.contracts.FSEnvelopeRegistry.abiRef).to.match(
			/^[a-f0-9]{64}$/,
		);
	});

	it("abiRef is stable for normalized JSON", () => {
		const abi = [{ type: "function", name: "foo", inputs: [] }];
		const ref = abiRefFromAbi(abi);
		expect(ref).to.equal(abiRefFromAbi(JSON.parse(normalizeAbiJson(abi))));
	});

	it("getHistoricalAbi returns null when chain has no deployment", () => {
		const abi = getHistoricalAbi(
			"FSEnvelopeRegistry",
			"0x0000000000000000000000000000000000000001",
			"mainnet",
		);
		expect(abi).to.equal(null);
	});
});
