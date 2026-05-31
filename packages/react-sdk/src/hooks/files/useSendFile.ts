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
	type AttachmentPacketSendInput,
	buildRegistrationEmailCommitments,
	computePlacementCommitment,
	encodeFileDataV2,
	hashNormalizedSignerEmail,
	hashOrgIdCommitment,
	isPlacementManifestV3,
	normalizePlacementRecipientEmail,
	type PlacementManifest,
	type RegisterRoutingInput,
	ZERO_ORG_ID_COMMITMENT,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import type { AttachmentPacketDraft } from "../../lib/attachment-packets";
import {
	encryptAttachmentPacket,
	wrapAttachmentPacketDekForCold,
	wrapAttachmentPacketDekForWarm,
} from "../../lib/attachment-packets";
import { latestChainTimestamp } from "../../lib/chain-time";
import { invalidateEntitlements } from "../../lib/invalidate-entitlements";
import {
	type AttachmentRuleDraft,
	registerAttachmentRulesOnChain,
} from "../../lib/register-attachment-rules";
import { buildValidatedRegisterRouting } from "../../lib/register-routing";
import {
	registerSettlementRulesOnChain,
	type SettlementRuleDraft,
} from "../../lib/settlement-rules.ts";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { calculatePieceCid } from "../../utils/piece.ts";
import { useUserProfile } from "../users";

export function useSendFile() {
	const {
		contracts,
		wallet,
		runtime: { chainKey },
	} = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const { data: user } = useUserProfile();

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			signers: {
				address: Address;
				encryptionPublicKey: Hex;
			}[];
			viewers: { address: Address; encryptionPublicKey: string }[];
			documents: {
				id: string;
				name: string;
				mimeType: string;
				bytes: Uint8Array;
			}[];
			metadata: { name: string };
			placementManifest: PlacementManifest;
			attachmentPacketDrafts?: AttachmentPacketDraft[];
			/** Resolved warm recipients for attachment packet KEM wraps (email → wallet + encryption PK). */
			warmRecipientsByEmail?: {
				email: string;
				address: Address;
				encryptionPublicKey: Hex;
			}[];
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
				documents,
				metadata,
				placementManifest,
				attachmentPacketDrafts = [],
				warmRecipientsByEmail = [],
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

			if (documents.length === 0) {
				throw new Error("At least one signable document is required");
			}

			if (!isPlacementManifestV3(placementManifest)) {
				throw new Error("New sends require placement manifest version 3");
			}
			const data = await encodeFileDataV2({
				documents,
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
			const coldPhrase = coldInvitePairs[0]?.phrase;
			const warmByEmail = new Map(
				warmRecipientsByEmail.map((r) => [
					normalizePlacementRecipientEmail(r.email),
					r,
				]),
			);
			const coldEmailSet = new Set(
				(coldInvites ?? []).map((c) =>
					normalizePlacementRecipientEmail(c.email),
				),
			);
			const attachmentPackets: AttachmentPacketSendInput[] = [];

			for (const draft of attachmentPacketDrafts) {
				const encryptedPacket = await encryptAttachmentPacket({
					packet: draft,
				});
				const uploadStart = await rpc.attachments.uploadStart({
					packetCid: encryptedPacket.packetCid,
				});
				const putRes = await fetch(uploadStart.uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": "application/octet-stream" },
					body: new Blob([Uint8Array.from(encryptedPacket.ciphertext)]),
				});
				if (!putRes.ok) {
					throw new Error(`Attachment upload failed: ${putRes.statusText}`);
				}

				const warmWraps: NonNullable<AttachmentPacketSendInput["warmWraps"]> =
					[];
				const coldWraps: NonNullable<AttachmentPacketSendInput["coldWraps"]> =
					[];

				for (const email of draft.recipientEmails) {
					const normalized = normalizePlacementRecipientEmail(email);
					const warm = warmByEmail.get(normalized);
					if (warm) {
						const wrap = await wrapAttachmentPacketDekForWarm({
							packetCid: encryptedPacket.packetCid,
							packetId: draft.packetId,
							packetDek: encryptedPacket.packetDek,
							recipient: {
								email: normalized,
								encryptionPublicKey: warm.encryptionPublicKey,
							},
						});
						warmWraps.push({
							email: normalized,
							kemCiphertext: wrap.kemCiphertext,
							encryptedPacketDek: wrap.encryptedPacketDek,
						});
						continue;
					}
					if (coldEmailSet.has(normalized) && coldPhrase) {
						coldWraps.push({
							email: normalized,
							wrappedPacketDek: await wrapAttachmentPacketDekForCold({
								packetId: draft.packetId,
								packetDek: encryptedPacket.packetDek,
								phrase: coldPhrase,
							}),
						});
					}
				}

				attachmentPackets.push({
					packetId: draft.packetId,
					label: draft.label,
					releaseMode: draft.releaseMode,
					releaseType: draft.releaseType,
					releaseParams: draft.releaseParams,
					recipientEmails: draft.recipientEmails.map((e) =>
						normalizePlacementRecipientEmail(e),
					),
					packetCid: encryptedPacket.packetCid,
					packetContentHash: encryptedPacket.packetContentHash,
					warmWraps: warmWraps.length > 0 ? warmWraps : undefined,
					coldWraps: coldWraps.length > 0 ? coldWraps : undefined,
				});
			}

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
				...(attachmentPackets.length > 0 ? { attachmentPackets } : {}),
			};

			await rpcQuery.files.register.call({
				...requestPayload,
				displayName: metadata.name,
				mimeType: "application/pdf",
				ciphertextByteLength: encryptedData.byteLength,
			});

			const conditionalDrafts = attachmentPacketDrafts.filter(
				(d) => d.releaseMode === "conditional",
			);
			if (conditionalDrafts.length > 0) {
				const registered = await registerAttachmentRulesOnChain({
					wallet,
					contracts,
					pieceCid: pieceCid.toString(),
					rules: conditionalDrafts.map((draft): AttachmentRuleDraft => {
						const packet = attachmentPackets.find(
							(p) => p.packetId === draft.packetId,
						);
						if (!packet?.packetContentHash) {
							throw new Error(
								`Missing packet hash for conditional packet ${draft.packetId}`,
							);
						}
						const releaseType = draft.releaseType ?? "all_required_signed";
						return {
							packetId: draft.packetId,
							packetContentHash: packet.packetContentHash as Hex,
							releaseType,
							releaseParams: (draft.releaseParams ?? {
								releaseType,
							}) as AttachmentRuleDraft["releaseParams"],
							recipientEmails: draft.recipientEmails,
						};
					}),
				});
				for (const rec of registered) {
					const packet = attachmentPackets.find(
						(p) => p.packetId === rec.packetId,
					);
					if (!packet?.packetContentHash) continue;
					await rpc.attachments.linkOnChainRule({
						pieceCid: pieceCid.toString(),
						packetId: rec.packetId,
						onChainRuleId: rec.onChainRuleId,
						releaseContractAddress: rec.releaseContractAddress,
						registerRuleTxHash: rec.registerRuleTxHash,
						packetContentHash: packet.packetContentHash,
					});
				}
			}

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
