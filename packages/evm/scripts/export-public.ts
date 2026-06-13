/**
 * Copy curated verify surfaces into `@filosign/contracts` (oss/packages/contracts).
 * Run after deploy + gen:definitions on testnet/mainnet.
 */
import { CHAIN_ID_BY_KEY, type ChainKey } from "../definitions/chain-key.js";
import { readAbiFromStore } from "./lib/definitions/abi-store.js";
import {
	PUBLIC_ABIS_ROOT,
	PUBLIC_CHAINS_MANIFEST,
} from "./lib/definitions/paths.js";
import { readLatestManifest } from "./lib/definitions/persist-deployment.js";

const PUBLIC_CHAINS: ChainKey[] = ["testnet", "mainnet"];

const ABI_FILES = {
	FSEnvelopeRegistry: "FSEnvelopeRegistry.json",
	FSPaymentValidator: "FSPaymentValidator.json",
	FSAttachmentRelease: "FSAttachmentRelease.json",
} as const;

async function exportAbis(chainKey: ChainKey) {
	const manifest = await readLatestManifest(chainKey);
	if (!manifest) {
		console.warn(`export-public: skip abis - no deployment for ${chainKey}`);
		return;
	}

	for (const [name, filename] of Object.entries(ABI_FILES)) {
		const ref = manifest.contracts[name as keyof typeof ABI_FILES];
		if (!ref) continue;
		const abi = await readAbiFromStore(ref.abiRef);
		await Bun.write(
			`${PUBLIC_ABIS_ROOT}/${filename}`,
			`${JSON.stringify(abi, null, 2)}\n`,
		);
		console.log(`export-public: wrote ${filename} from ${chainKey}`);
	}
}

async function exportChainManifest() {
	const existing = (await Bun.file(PUBLIC_CHAINS_MANIFEST).json()) as Record<
		string,
		{
			name: string;
			registryAddress?: string;
			paymentValidatorAddress?: string;
			attachmentReleaseAddress?: string;
			explorerTxUrl: string;
			defaultRpcUrl?: string;
		}
	>;

	for (const chainKey of PUBLIC_CHAINS) {
		const manifest = await readLatestManifest(chainKey);
		const chainId = String(CHAIN_ID_BY_KEY[chainKey]);
		const entry = existing[chainId];
		if (!entry) {
			console.warn(`export-public: skip manifest - no template for ${chainId}`);
			continue;
		}
		if (!manifest) {
			console.warn(
				`export-public: skip manifest addresses - no deployment for ${chainKey}`,
			);
			continue;
		}

		existing[chainId] = {
			...entry,
			registryAddress: manifest.contracts.FSEnvelopeRegistry.address,
			paymentValidatorAddress: manifest.contracts.FSPaymentValidator.address,
			attachmentReleaseAddress: manifest.contracts.FSAttachmentRelease.address,
		};
	}

	await Bun.write(
		PUBLIC_CHAINS_MANIFEST,
		`${JSON.stringify(existing, null, 2)}\n`,
	);
	console.log(`export-public: updated ${PUBLIC_CHAINS_MANIFEST}`);
}

async function main() {
	for (const chainKey of PUBLIC_CHAINS) {
		await exportAbis(chainKey);
	}
	await exportChainManifest();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
