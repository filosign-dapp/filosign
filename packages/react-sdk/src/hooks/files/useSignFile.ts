import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	computeCommitment,
	jsonStringify,
	signatures,
	toHex,
} from "@filosign/crypto-utils";
import {
	completionsMerkleRootV1,
	type FieldCompletionMap,
	hashNormalizedSignerEmail,
	LEAF_SCHEMA_VERSION_V1,
	SETTLEMENT_FEATURE_TERMS_VERSION,
	zPlacementManifest,
} from "@filosign/shared";
import type { InferClientOutputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAddress } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { envelopeRegistryAt } from "../../lib/envelope-registry-at";
import { invalidateInboxQueries } from "../../lib/invalidate-queries";
import { withRegistryWalletActionLock } from "../../lib/registry-wallet-action-lock";
import { resolveSignerEmailForSigning } from "../../lib/resolve-signer-email-for-signing";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useCryptoSeed } from "../auth";
import { useUserProfile } from "../users/useUserProfile";

export function useSignFile() {
	const { contracts, wallet, wasm } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();
	const { action: cryptoAction } = useCryptoSeed();
	const { data: userProfile } = useUserProfile();

	type PieceDetail =
		InferClientOutputs<AppRouterClient>["files"]["piece"]["detail"];

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			completedFieldIds: string[];
			fieldCompletions?: FieldCompletionMap;
			settlementRecipientAck?: {
				termsVersion: string;
				acceptedAt: number;
			};
		}) => {
			let success = false;

			const {
				pieceCid,
				completedFieldIds,
				fieldCompletions,
				settlementRecipientAck,
			} = args;
			const textEncoder = new TextEncoder();

			const dilithium = wasm.dilithium;
			if (!contracts || !wallet || !dilithium || !isAuthed) {
				throw new Error("not connected");
			}

			const timestamp = await latestChainTimestamp(contracts);

			await cryptoAction(async (seed: Uint8Array) => {
				const fileResponse: PieceDetail =
					await rpcQuery.files.piece.detail.call({
						pieceCid,
					});

				const {
					sender,
					registryAddress,
					placementCommitment,
					placementManifest: manifestRaw,
				} = fileResponse;
				const registry = envelopeRegistryAt(contracts, registryAddress);

				if (manifestRaw == null) {
					throw new Error(
						"Document manifest unavailable; acknowledge and view the document first",
					);
				}
				const manifest = zPlacementManifest.parse(manifestRaw);
				const signerAddr = getAddress(wallet.account.address);

				const manifestAssignedEmails = [
					...new Set(manifest.fields.map((f) => f.assignedRecipientEmail)),
				];
				const signerEmail = resolveSignerEmailForSigning({
					signerWallet: signerAddr,
					senderWallet: getAddress(sender),
					fileSigners: fileResponse.signers.map((s) => ({
						wallet: getAddress(s.wallet),
						email: s.email,
					})),
					profileEmail: userProfile?.email,
					manifestAssignedEmails,
				});
				if (!signerEmail) {
					throw new Error(
						"Your Filosign profile must include an email to sign placed fields for this document",
					);
				}
				const signerEmailCommitment = hashNormalizedSignerEmail(signerEmail);

				const authSubjectCommitment = userProfile?.authSubjectCommitment;
				if (!authSubjectCommitment) {
					throw new Error(
						"Profile missing Auth subject commitment; try re-login.",
					);
				}

				const placementCommitmentHex = placementCommitment;

				const assignedIds = manifest.fields
					.filter((f) => f.assignedRecipientEmail === signerEmail)
					.map((f) => f.id);

				const allowed = new Set(assignedIds);
				for (const id of completedFieldIds) {
					if (!allowed.has(id)) {
						throw new Error(
							"completedFieldIds must match manifest fields for signer",
						);
					}
				}
				const fieldIds = completedFieldIds;

				if (fieldIds.length === 0) {
					throw new Error("No fields assigned to this signer");
				}

				const completionsRoot = completionsMerkleRootV1({
					fieldIds,
					placementCommitment: placementCommitmentHex,
					pieceCid,
					signer: signerAddr,
				});

				const cidIdentifier = computeCidIdentifier(pieceCid);
				const reg = await registry.read.envelopeRegistrations([cidIdentifier]);
				const signersCommitment = reg.signersCommitment;

				const dl3SignatureMessage = jsonStringify({
					pieceCid,
					sender,
					signer: wallet.account.address,
					timestamp,
					completionsRoot,
					leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
				});
				const dl3Keypair = await signatures.keyGen({
					dl: dilithium,
					seed: seed,
				});
				const dl3Signature = await signatures.sign({
					dl: dilithium,
					privateKey: dl3Keypair.privateKey,
					message: textEncoder.encode(dl3SignatureMessage),
				});

				const dl3SignatureCommitment = computeCommitment([toHex(dl3Signature)]);
				const signature = await withRegistryWalletActionLock(
					wallet.account.address,
					() =>
						eip712signature(
							contracts,
							"FSEnvelopeRegistry",
							{
								types: {
									SignEnvelope: [
										{ name: "cidIdentifier", type: "bytes32" },
										{ name: "sender", type: "address" },
										{ name: "signerWallet", type: "address" },
										{ name: "signerEmailCommitment", type: "bytes32" },
										{ name: "authSubjectCommitment", type: "bytes32" },
										{ name: "dl3SignatureCommitment", type: "bytes20" },
										{ name: "completionsRoot", type: "bytes32" },
										{ name: "leafSchemaVersion", type: "uint8" },
										{ name: "signersCommitment", type: "bytes20" },
										{ name: "timestamp", type: "uint256" },
									],
								},
								primaryType: "SignEnvelope",
								message: {
									cidIdentifier,
									sender,
									signerWallet: wallet.account.address,
									signerEmailCommitment,
									authSubjectCommitment,
									dl3SignatureCommitment,
									completionsRoot,
									leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
									signersCommitment,
									timestamp: BigInt(timestamp),
								},
							},
							{ verifyingContract: registry.address },
						),
				);
				const settlementRules = await rpcQuery.settlements.listByFile.call({
					pieceCid,
				});
				const needsPayoutAck = settlementRules.length > 0;
				if (needsPayoutAck) {
					if (
						!settlementRecipientAck ||
						settlementRecipientAck.termsVersion !==
							SETTLEMENT_FEATURE_TERMS_VERSION
					) {
						throw new Error(
							"Acknowledge the attached payout disclosure before signing",
						);
					}
				}

				await rpcQuery.files.piece.sign.call({
					pieceCid,
					body: {
						signature,
						timestamp,
						dl3Signature: toHex(dl3Signature),
						completedFieldIds,
						...(fieldCompletions && Object.keys(fieldCompletions).length > 0
							? {
									fieldCompletions: Object.fromEntries(
										Object.entries(fieldCompletions).map(([id, c]) => [
											id,
											{
												fieldId: c.fieldId,
												valueKind: c.valueKind,
												sourceArtifactId: c.sourceArtifactId,
												storageKey: c.storageKey,
												contentSha256: c.contentSha256,
												textValue: c.textValue,
											},
										]),
									),
								}
							: {}),
						...(needsPayoutAck ? { settlementRecipientAck } : {}),
					},
				});
				success = true;
			});

			return success;
		},
		onSuccess: (_data, variables) => {
			void invalidateInboxQueries(queryClient, rpcQuery);
			if (variables.pieceCid) {
				void queryClient.invalidateQueries({
					queryKey: rpcQuery.files.piece.detail.key({
						input: { pieceCid: variables.pieceCid },
					}),
				});
			}
		},
	});
}
