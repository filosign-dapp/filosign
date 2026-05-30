import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	encryption,
	generateColdInvitePhrase,
	KEM,
	randomBytes,
	toBytes,
	toHex,
	wrapColdInviteDek,
} from "@filosign/crypto-utils";
import {
	buildRegistrationEmailCommitments,
	computePlacementCommitment,
	encodeFileData,
	hashNormalizedSignerEmail,
	hashOrgIdCommitment,
	normalizePlacementRecipientEmail,
	type RegisterRoutingInput,
	ZERO_ORG_ID_COMMITMENT,
	type zFileData,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { invalidateEntitlements } from "../../lib/invalidate-entitlements";
import { buildValidatedRegisterRouting } from "../../lib/register-routing";
import {
	registerSettlementRulesOnChain,
	type SettlementRuleDraft,
} from "../../lib/settlement-rules.ts";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { calculatePieceCid } from "../../utils/piece.ts";
import { useUserProfile } from "../users";

type FileData = z.infer<ReturnType<typeof zFileData>>;

export function useSendFile() {
	const {
		contracts,
		wallet,
		runtime: { chainKey },
	} = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const { data: user } = useUserProfile();

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			signers: {
				address: Address;
				encryptionPublicKey: Hex;
			}[];
			viewers: { address: Address; encryptionPublicKey: string }[];
			bytes: Uint8Array;
			metadata: FileData["metadata"];
			placementManifest: FileData["placementManifest"];
			coldInvites?: { email: string; isSigner: boolean }[];
			/** Normalized viewer emails (non-signer recipients); must match server derivation. */
			viewerEmails: string[];
			/** When set, send as organization (requires X-Org-Id on session). */
			organizationId?: string;
			orgEncryptionPublicKey?: Hex;
			/** On-chain settlement rules (register + approve before files.register). */
			settlementRules?: SettlementRuleDraft[];
			/** Advanced registry routing (sequential, optional signers, quorum). */
			routing?: RegisterRoutingInput;
		}) => {
			const {
				signers,
				viewers,
				bytes,
				metadata,
				placementManifest,
				coldInvites,
				viewerEmails,
				organizationId,
				orgEncryptionPublicKey,
				settlementRules = [],
				routing,
			} = args;

			if (!contracts || !wallet || !user || !isAuthed) {
				throw new Error(
					"Not connected: contracts, wallet, profile, and auth required",
				);
			}

			const timestamp = await latestChainTimestamp(contracts);

			const rawSenderEmail = user.email?.trim();
			if (!rawSenderEmail) {
				throw new Error(
					"Add a primary email to your Filosign profile before sending documents",
				);
			}
			const senderEmailCommitment = hashNormalizedSignerEmail(
				normalizePlacementRecipientEmail(rawSenderEmail),
			);
			const senderPrivySubjectCommitment = user.privySubjectCommitment;
			if (!senderPrivySubjectCommitment?.trim()) {
				throw new Error(
					"Profile missing identity commitment; try signing out and back in.",
				);
			}

			const data = encodeFileData({
				bytes: bytes,
				sender: wallet.account.address,
				timestamp,
				metadata,
				placementManifest,
			});

			const placementCommitment = computePlacementCommitment(placementManifest);

			const encryptionKey = randomBytes(32);
			const encryptionInfo = "ignore-encryption-info";
			const encryptedData = await encryption.encrypt({
				message: data,
				secretKey: encryptionKey,
				info: encryptionInfo,
			});

			const pieceCid = calculatePieceCid(encryptedData);

			const viewedParticipants: Record<Address, boolean> = {};
			const participants: {
				address: Address;
				kemCiphertext: Hex;
				encryptedEncryptionKey: Hex;
				isSigner: boolean;
			}[] = [];

			const { ciphertext: selfKemCiphertext, sharedSecret: sKEM } =
				await KEM.encapsulate({
					publicKeyOther: toBytes(user.encryptionPublicKey),
				});
			const selfEncryptedEncryptionKey = await encryption.encrypt({
				message: encryptionKey,
				secretKey: sKEM,
				info: `${pieceCid.toString()}:${wallet.account.address}`,
			});
			viewedParticipants[wallet.account.address] = true;

			let orgKemCiphertext: Hex | undefined;
			let orgEncryptedEncryptionKey: Hex | undefined;
			if (organizationId && orgEncryptionPublicKey) {
				const { ciphertext, sharedSecret } = await KEM.encapsulate({
					publicKeyOther: toBytes(orgEncryptionPublicKey),
				});
				orgKemCiphertext = toHex(ciphertext);
				orgEncryptedEncryptionKey = toHex(
					await encryption.encrypt({
						message: encryptionKey,
						secretKey: sharedSecret,
						info: `${pieceCid.toString()}:org:${organizationId}`,
					}),
				);
			}

			for (const signer of signers) {
				if (viewedParticipants[signer.address]) continue;
				viewedParticipants[signer.address] = true;

				const { ciphertext: recipientKemCiphertext, sharedSecret: ssKEM } =
					await KEM.encapsulate({
						publicKeyOther: toBytes(signer.encryptionPublicKey),
					});
				const recipientEncryptedEncryptionKey = await encryption.encrypt({
					message: encryptionKey,
					secretKey: ssKEM,
					info: `${pieceCid.toString()}:${signer.address}`,
				});

				participants.push({
					address: signer.address,
					kemCiphertext: toHex(recipientKemCiphertext),
					encryptedEncryptionKey: toHex(recipientEncryptedEncryptionKey),
					isSigner: true,
				});
			}
			for (const viewer of viewers) {
				if (viewedParticipants[viewer.address])
					throw new Error(`Duplicate viewer address ${viewer.address}`);
				viewedParticipants[viewer.address] = true;

				const { ciphertext: recipientKemCiphertext, sharedSecret: ssKEM } =
					await KEM.encapsulate({
						publicKeyOther: toBytes(viewer.encryptionPublicKey),
					});
				const recipientEncryptedEncryptionKey = await encryption.encrypt({
					message: encryptionKey,
					secretKey: ssKEM,
					info: `${pieceCid.toString()}:${viewer.address}`,
				});

				participants.push({
					address: viewer.address,
					kemCiphertext: toHex(recipientKemCiphertext),
					encryptedEncryptionKey: toHex(recipientEncryptedEncryptionKey),
					isSigner: false,
				});
			}

			const uploadStartRaw = await rpcQuery.files.uploadStart.call({
				pieceCid: pieceCid.toString(),
			});
			const uploadStartResponse = z
				.object({ uploadUrl: z.string() })
				.parse(uploadStartRaw);

			const uploadResponse = await fetch(uploadStartResponse.uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": "application/octet-stream",
				},
				body: encryptedData,
			});

			if (!uploadResponse.ok) {
				throw new Error(`Upload failed: ${uploadResponse.statusText}`);
			}

			const nonce = await contracts.FSFileRegistry.read.nonce([
				wallet.account.address,
			]);

			const cidIdentifier = computeCidIdentifier(pieceCid.toString());

			const { viewersCommitment } = buildRegistrationEmailCommitments({
				placementManifest,
				viewerEmails,
			});
			const {
				calldata: routingCalldata,
				signersCommitment,
				requiredCommitmentsHash,
				optionalCommitmentsHash,
				routingOrderHash,
				quorumSetHash,
			} = buildValidatedRegisterRouting({ placementManifest, routing });

			const orgIdCommitment = organizationId
				? hashOrgIdCommitment(organizationId)
				: ZERO_ORG_ID_COMMITMENT;

			const signature = await eip712signature(contracts, "FSFileRegistry", {
				types: {
					RegisterFile: [
						{ name: "cidIdentifier", type: "bytes32" },
						{ name: "sender", type: "address" },
						{ name: "signersCommitment", type: "bytes20" },
						{ name: "viewersCommitment", type: "bytes20" },
						{ name: "placementCommitment", type: "bytes32" },
						{ name: "senderEmailCommitment", type: "bytes32" },
						{ name: "senderPrivySubjectCommitment", type: "bytes32" },
						{ name: "orgIdCommitment", type: "bytes32" },
						{ name: "requiredCommitmentsHash", type: "bytes32" },
						{ name: "optionalCommitmentsHash", type: "bytes32" },
						{ name: "routingMode", type: "uint8" },
						{ name: "routingOrderHash", type: "bytes32" },
						{ name: "quorumN", type: "uint8" },
						{ name: "quorumSetHash", type: "bytes32" },
						{ name: "timestamp", type: "uint256" },
						{ name: "nonce", type: "uint256" },
					],
				},
				primaryType: "RegisterFile",
				message: {
					cidIdentifier: cidIdentifier,
					sender: wallet.account.address,
					signersCommitment,
					viewersCommitment,
					placementCommitment,
					senderEmailCommitment,
					senderPrivySubjectCommitment,
					orgIdCommitment,
					requiredCommitmentsHash,
					optionalCommitmentsHash,
					routingMode: routingCalldata.routingMode,
					routingOrderHash,
					quorumN: routingCalldata.quorumN,
					quorumSetHash,
					timestamp: BigInt(timestamp),
					nonce: BigInt(nonce),
				},
			});

			const coldInvitePairs =
				coldInvites?.length && pieceCid
					? await (async () => {
							const phrase = generateColdInvitePhrase();
							const inviteToken = toHex(randomBytes(32));
							const wrapped = toHex(
								await wrapColdInviteDek({
									encryptionKey,
									phrase,
								}),
							);
							return coldInvites.map((c) => ({
								row: {
									email: c.email.trim().toLowerCase(),
									inviteToken,
									wrappedEncryptionKey: wrapped,
									isSigner: c.isSigner,
								},
								phrase,
							}));
						})()
					: [];

			const coldInviteRows = coldInvitePairs.map((p) => p.row);
			const firstColdInvite = coldInvitePairs[0];
			const coldInviteShareCode = firstColdInvite
				? {
						phrase: firstColdInvite.phrase,
						inviteToken: firstColdInvite.row.inviteToken,
						emails: coldInviteRows.map((r) => r.email),
					}
				: undefined;

			const requestPayload = {
				pieceCid: pieceCid.toString(),
				participants: participants,
				signature: signature,
				senderEncryptedEncryptionKey: toHex(selfEncryptedEncryptionKey),
				senderKemCiphertext: toHex(selfKemCiphertext),
				timestamp: timestamp,
				placementCommitment,
				placementManifest,
				...(organizationId && orgKemCiphertext && orgEncryptedEncryptionKey
					? {
							organizationId,
							orgKemCiphertext,
							orgEncryptedEncryptionKey,
						}
					: {}),
				...(coldInviteRows.length > 0 ? { coldInvites: coldInviteRows } : {}),
				...(routing ? { routing } : {}),
			};

			await rpcQuery.files.register.call({
				...requestPayload,
				displayName: metadata.name,
				mimeType: "application/pdf",
				ciphertextByteLength: encryptedData.byteLength,
			});

			const settlementRuleRecords =
				settlementRules.length > 0
					? await registerSettlementRulesOnChain({
							wallet,
							contracts,
							chainKey,
							payer: wallet.account.address,
							cidIdentifier,
							rules: settlementRules,
						})
					: [];

			if (settlementRuleRecords.length > 0) {
				await rpcQuery.settlements.registerForFile.call({
					pieceCid: pieceCid.toString(),
					...(organizationId ? { organizationId } : {}),
					rules: settlementRuleRecords,
				});
			}

			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.list.sent.key(),
			});
			if (organizationId) {
				void queryClient.invalidateQueries({
					queryKey: rpcQuery.files.list.org.key(),
				});
			}
			void invalidateEntitlements(queryClient, rpcQuery);

			return {
				success: true as const,
				pieceCid: pieceCid.toString(),
				...(coldInviteShareCode ? { coldInviteShareCode } : {}),
			};
		},
	});
}
