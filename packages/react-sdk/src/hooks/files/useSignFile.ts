import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	computeCommitment,
	jsonStringify,
	signatures,
	toHex,
} from "@filosign/crypto-utils";
import {
	completionsMerkleRootV1,
	hashNormalizedSignerEmail,
	LEAF_SCHEMA_VERSION_V1,
	normalizePlacementRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import type { InferClientOutputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { getAddress } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { invalidateInboxQueries } from "../../lib/invalidate-queries";
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
		}) => {
			let success = false;

			const { pieceCid, completedFieldIds } = args;
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
					placementCommitment,
					placementManifest: manifestRaw,
				} = fileResponse;

				if (manifestRaw == null) {
					throw new Error(
						"Document manifest unavailable; acknowledge and view the document first",
					);
				}
				const manifest = zPlacementManifest.parse(manifestRaw);
				const signerAddr = getAddress(wallet.account.address);

				const selfSigner = fileResponse.signers.find(
					(s) => getAddress(s.wallet) === signerAddr,
				);
				const rawEmail = selfSigner?.email?.trim() ?? "";
				if (!rawEmail) {
					throw new Error(
						"Your Filosign profile must include an email to sign placed fields for this document",
					);
				}
				const signerEmail = normalizePlacementRecipientEmail(rawEmail);
				const signerEmailCommitment = hashNormalizedSignerEmail(signerEmail);

				const privySubjectCommitment = userProfile?.privySubjectCommitment;
				if (!privySubjectCommitment) {
					throw new Error(
						"Profile missing Privy subject commitment; try re-login.",
					);
				}

				const placementCommitmentHex = placementCommitment as Hex;

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

				const nonce = await contracts.FSFileRegistry.read.nonce([
					wallet.account.address,
				]);

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
				const signature = await eip712signature(contracts, "FSFileRegistry", {
					types: {
						SignFile: [
							{ name: "cidIdentifier", type: "bytes32" },
							{ name: "sender", type: "address" },
							{ name: "signerWallet", type: "address" },
							{ name: "signerEmailCommitment", type: "bytes32" },
							{ name: "privySubjectCommitment", type: "bytes32" },
							{ name: "dl3SignatureCommitment", type: "bytes20" },
							{ name: "completionsRoot", type: "bytes32" },
							{ name: "leafSchemaVersion", type: "uint8" },
							{ name: "timestamp", type: "uint256" },
							{ name: "nonce", type: "uint256" },
						],
					},
					primaryType: "SignFile",
					message: {
						cidIdentifier,
						sender,
						signerWallet: wallet.account.address,
						signerEmailCommitment,
						privySubjectCommitment,
						dl3SignatureCommitment,
						completionsRoot,
						leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
						timestamp: BigInt(timestamp),
						nonce: BigInt(nonce),
					},
				});
				await rpcQuery.files.piece.sign.call({
					pieceCid,
					body: {
						signature,
						timestamp,
						dl3Signature: toHex(dl3Signature),
						completedFieldIds,
					},
				});
				success = true;
			});

			return success;
		},
		onSuccess: () => {
			void invalidateInboxQueries(queryClient, rpcQuery);
		},
	});
}
