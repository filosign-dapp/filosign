import type { ComplianceBundle, VerifyManifestV1 } from "@filosign/protocol";
import {
	complianceBundleSha256Hex,
	computeLeafHashV1,
	computePlacementCommitment,
	hashNormalizedSignerEmail,
	merkleRootFromLeafAndSiblings,
	sha256PlaintextHex,
} from "@filosign/protocol";
import type { CheckResult } from "../types";
import {
	compareCheck,
	normalizeHex,
	statusCheck,
	summarizeChecks,
} from "../utils/check";

export async function runLocalChecks(args: {
	bundle: ComplianceBundle;
	bundleJsonBytes?: Uint8Array | null;
	bundleSha256Sidecar?: string | null;
	manifest?: VerifyManifestV1 | null;
}): Promise<CheckResult[]> {
	const { bundle } = args;
	const results: CheckResult[] = [
		statusCheck({
			id: "local.bundle.schema",
			tier: "local",
			status: "pass",
			message: "bundle.json parsed against zComplianceBundle",
		}),
	];

	const recomputedCanonicalHash = await complianceBundleSha256Hex(bundle);
	const committedHash = args.bundleJsonBytes
		? await sha256PlaintextHex(args.bundleJsonBytes)
		: recomputedCanonicalHash;

	if (args.bundleSha256Sidecar) {
		const sidecarMatches =
			normalizeHex(args.bundleSha256Sidecar) === normalizeHex(committedHash);
		results.push(
			compareCheck({
				id: "local.bundle.sha256.sidecar",
				tier: "local",
				expected: args.bundleSha256Sidecar,
				actual: committedHash,
				message: sidecarMatches
					? "bundle.sha256 matches exact bundle.json bytes in packet"
					: "bundle.sha256 does not match exact bundle.json bytes in packet",
			}),
		);

		if (args.bundleJsonBytes) {
			const canonicalMatches =
				normalizeHex(args.bundleSha256Sidecar) ===
				normalizeHex(recomputedCanonicalHash);
			if (sidecarMatches && !canonicalMatches) {
				results.push(
					statusCheck({
						id: "local.bundle.sha256.canonical",
						tier: "local",
						status: "warn",
						message:
							"bundle.json bytes match sidecar, but canonical recomputation differs",
						expected: args.bundleSha256Sidecar,
						actual: recomputedCanonicalHash,
					}),
				);
			} else {
				results.push(
					compareCheck({
						id: "local.bundle.sha256.canonical",
						tier: "local",
						expected: args.bundleSha256Sidecar,
						actual: recomputedCanonicalHash,
						message: canonicalMatches
							? "Canonical bundle recomputation matches bundle.sha256"
							: "Canonical bundle recomputation does not match bundle.sha256",
					}),
				);
			}
		}
	} else {
		results.push(
			statusCheck({
				id: "local.bundle.sha256.sidecar",
				tier: "local",
				status: "skip",
				message: "No bundle.sha256 sidecar in packet",
			}),
		);
	}

	if (args.manifest) {
		const manifestMatches =
			normalizeHex(args.manifest.bundleSha256) === normalizeHex(committedHash);
		results.push(
			compareCheck({
				id: "local.manifest.bundleSha256",
				tier: "local",
				expected: args.manifest.bundleSha256,
				actual: committedHash,
				message: manifestMatches
					? "verify-manifest.json bundleSha256 matches exact bundle.json bytes"
					: "verify-manifest.json bundleSha256 does not match exact bundle.json bytes",
			}),
		);
		if (args.bundleSha256Sidecar) {
			const sidecarManifestMatch =
				normalizeHex(args.manifest.bundleSha256) ===
				normalizeHex(args.bundleSha256Sidecar);
			results.push(
				compareCheck({
					id: "local.manifest.sidecarMatch",
					tier: "local",
					expected: args.manifest.bundleSha256,
					actual: args.bundleSha256Sidecar,
					message: sidecarManifestMatch
						? "Manifest hash matches bundle.sha256 sidecar"
						: "Manifest hash does not match bundle.sha256 sidecar",
				}),
			);
		}
	}

	results.push(
		compareCheck({
			id: "local.placement.commitment",
			tier: "local",
			expected: bundle.placementCommitment,
			actual: computePlacementCommitment(bundle.placementManifest),
			message: "Placement manifest recomputes to bundle.placementCommitment",
		}),
	);

	for (const [index, party] of bundle.parties.entries()) {
		const recomputed = hashNormalizedSignerEmail(party.email);
		results.push(
			compareCheck({
				id: `local.parties[${index}].emailCommitment`,
				tier: "local",
				expected: party.emailCommitment,
				actual: recomputed,
				message: `Email commitment for ${party.role} ${party.email}`,
			}),
		);
		if (party.authSubjectCommitment) {
			results.push(
				statusCheck({
					id: `local.parties[${index}].authSubjectCommitment`,
					tier: "local",
					status: "warn",
					message:
						"authSubjectCommitment present; independent recompute requires IdP subject (not in bundle)",
				}),
			);
		}
	}

	const snapshot = bundle.onchainRegistration;
	if (snapshot) {
		results.push(
			compareCheck({
				id: "local.snapshot.placementCommitment",
				tier: "local",
				expected: snapshot.placementCommitment,
				actual: bundle.placementCommitment,
			}),
			compareCheck({
				id: "local.snapshot.documentSha256",
				tier: "local",
				expected: snapshot.documentSha256,
				actual: bundle.registration.registerDocumentSha256,
			}),
		);
	}

	for (const [index, signer] of bundle.signers.entries()) {
		if (!signer.completionsRoot || signer.merkleProofs.length === 0) {
			continue;
		}
		for (const proof of signer.merkleProofs) {
			const recomputedRoot = merkleRootFromLeafAndSiblings(
				proof.leafHash,
				proof.siblings,
			);
			results.push(
				compareCheck({
					id: `local.signers[${index}].merkleProof.${proof.fieldId}`,
					tier: "local",
					expected: signer.completionsRoot,
					actual: recomputedRoot,
					message: `Merkle proof for field ${proof.fieldId}`,
				}),
			);
			if (signer.signed && signer.wallet) {
				const leaf = computeLeafHashV1({
					fieldId: proof.fieldId,
					placementCommitment: bundle.placementCommitment,
					pieceCid: bundle.pieceCid,
					signer: signer.wallet,
				});
				results.push(
					compareCheck({
						id: `local.signers[${index}].leafHash.${proof.fieldId}`,
						tier: "local",
						expected: proof.leafHash,
						actual: leaf,
					}),
				);
			}
		}
	}

	return results;
}

export async function verifyLocal(args: {
	bundle: ComplianceBundle;
	bundleJsonBytes?: Uint8Array | null;
	bundleSha256Sidecar?: string | null;
	manifest?: VerifyManifestV1 | null;
}) {
	const results = await runLocalChecks(args);
	return summarizeChecks(results);
}

export function bundleHashMatchesSidecar(
	computedHash: string,
	sidecar: string | null | undefined,
): boolean {
	if (!sidecar) return false;
	return normalizeHex(computedHash) === normalizeHex(sidecar);
}
