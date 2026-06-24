import type { AttachmentPacketSendInput } from "@filosign/shared";
import { parseHexString } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import type { AttachmentPacketDraft } from "../../lib/attachment-packets";
import { invalidateEntitlements } from "../../lib/invalidate-entitlements";
import { registerAttachmentRulesOnChain } from "../../lib/register-attachment-rules";
import { processAttachmentPackets } from "../../lib/send-file/process-attachment-packets";
import type { SendFileWarmRecipient } from "../../lib/send-file/types";
import { useUserProfile } from "../users/useUserProfile";

export function useAttachAttachmentPacketForFile(pieceCid: string | undefined) {
	const { wallet, contracts, rpc, rpcQuery } = useFilosignContext();
	const { data: user } = useUserProfile();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			drafts: AttachmentPacketDraft[];
			warmRecipientsByEmail: SendFileWarmRecipient[];
			organizationId?: string;
			orgEncryptionPublicKey?: Hex;
			coldInvites?: { email: string }[];
		}) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts) {
				throw new Error("Sign in to attach a file packet.");
			}

			const attachmentPackets = await processAttachmentPackets({
				rpc,
				attachmentPacketDrafts: args.drafts,
				warmRecipientsByEmail: args.warmRecipientsByEmail,
				coldInvites: args.coldInvites,
				sender: user?.email
					? {
							email: user.email,
							encryptionPublicKey: user.encryptionPublicKey,
						}
					: null,
				organizationId: args.organizationId ?? null,
				orgEncryptionPublicKey: args.orgEncryptionPublicKey,
			});

			await rpcQuery.attachments.registerForFile.call({
				pieceCid,
				...(args.organizationId ? { organizationId: args.organizationId } : {}),
				packets: attachmentPackets,
			});

			const conditionalDrafts = args.drafts.filter(
				(d) => d.releaseMode === "conditional",
			);
			if (conditionalDrafts.length > 0) {
				const registered = await registerAttachmentRulesOnChain({
					wallet,
					contracts,
					pieceCid,
					rules: conditionalDrafts.map((draft) => {
						const packet = attachmentPackets.find(
							(p: AttachmentPacketSendInput) => p.packetId === draft.packetId,
						);
						if (!packet?.packetContentHash) {
							throw new Error(
								`Missing packet hash for conditional packet ${draft.packetId}`,
							);
						}
						const releaseType = draft.releaseType ?? "all_signed";
						if (!draft.releaseParams) {
							throw new Error(
								`Missing release params for conditional packet ${draft.packetId}`,
							);
						}
						return {
							packetId: draft.packetId,
							packetContentHash: parseHexString(packet.packetContentHash),
							releaseType,
							releaseParams: draft.releaseParams,
							recipientEmails: draft.recipientEmails,
						};
					}),
				});

				for (const rec of registered) {
					const packet = attachmentPackets.find(
						(p: AttachmentPacketSendInput) => p.packetId === rec.packetId,
					);
					if (!packet?.packetContentHash) continue;
					await rpc.attachments.linkOnChainRule({
						pieceCid,
						packetId: rec.packetId,
						onChainRuleId: rec.onChainRuleId,
						releaseContractAddress: rec.releaseContractAddress,
						registerRuleTxHash: rec.registerRuleTxHash,
						packetContentHash: packet.packetContentHash,
					});
				}
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.key(),
			});
			if (pieceCid) {
				void queryClient.invalidateQueries({
					queryKey: rpcQuery.files.key(),
				});
			}
			void invalidateEntitlements(queryClient, rpcQuery);
		},
	});
}
