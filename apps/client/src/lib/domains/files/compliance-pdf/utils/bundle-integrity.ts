import {
	type ComplianceBundle,
	canonicalComplianceBundleJson,
	sha256PlaintextHex,
} from "@filosign/shared";

export type ProofPacketBundleBytes = {
	canonicalJson: string;
	bytes: Uint8Array;
	sha256: `0x${string}`;
};

export async function buildProofPacketBundleBytes(args: {
	bundle: ComplianceBundle;
	expectedHash: `0x${string}`;
}): Promise<ProofPacketBundleBytes> {
	const canonicalJson = canonicalComplianceBundleJson(args.bundle);
	const bytes = new TextEncoder().encode(canonicalJson);
	const sha256 = await sha256PlaintextHex(bytes);

	if (sha256.toLowerCase() !== args.expectedHash.toLowerCase()) {
		throw new Error(
			"Cannot build proof packet: canonical bundle bytes do not match bundle hash",
		);
	}

	return { canonicalJson, bytes, sha256 };
}
