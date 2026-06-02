import {
	hashNormalizedSignerEmail,
	SUPPLEMENTARY_ATTACHMENT_LIMITS,
	zAttachmentPacketSendInput,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";

const {
	envelopeAttachmentPackets,
	envelopeAttachmentPacketRecipients,
	envelopeAttachmentPacketColdWraps,
	attachmentReleaseRules,
} = db.schema;

const zAttachmentPacketsRegister = z
	.array(zAttachmentPacketSendInput)
	.max(SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope);

export async function insertAttachmentPacketsForFile(args: {
	pieceCid: string;
	sender: Address;
	organizationId: string | null;
	packets: unknown;
	coldInviteToken?: string;
}) {
	const parsed = zAttachmentPacketsRegister.safeParse(args.packets ?? []);
	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	if (parsed.data.length === 0) return;

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(args.sender),
		args.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.supplementary_attachments");

	for (const packet of parsed.data) {
		if (packet.releaseMode === "conditional") {
			assertEntitlement(
				entitlementCtx,
				"features.supplementary_attachments.conditional_release",
			);
		}
	}

	for (const packet of parsed.data) {
		const storageKey = `uploads/attachments/${packet.packetCid}`;
		if (!(await bucket.exists(storageKey))) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Attachment packet not found on storage: ${packet.packetId}`,
			});
		}
	}

	await db.transaction(async (tx) => {
		for (const packet of parsed.data) {
			const [packetRow] = await tx
				.insert(envelopeAttachmentPackets)
				.values({
					filePieceCid: args.pieceCid,
					packetId: packet.packetId,
					packetCid: packet.packetCid,
					label: packet.label ?? null,
					releaseMode: packet.releaseMode,
					releaseType:
						packet.releaseMode === "conditional"
							? (packet.releaseType ?? null)
							: null,
					releaseParams: packet.releaseParams ?? null,
					onChainRuleId:
						packet.onChainRuleId != null && packet.onChainRuleId !== ""
							? BigInt(packet.onChainRuleId)
							: null,
					releaseContractAddress: packet.releaseContractAddress
						? getAddress(packet.releaseContractAddress)
						: null,
					registerRuleTxHash:
						(packet.registerRuleTxHash as Hex | undefined) ?? null,
				})
				.returning({ id: envelopeAttachmentPackets.id });

			if (!packetRow) continue;

			const wrappedEmails = new Set<string>();

			if (packet.warmWraps?.length) {
				for (const w of packet.warmWraps) {
					const email = w.email.trim().toLowerCase();
					wrappedEmails.add(email);
				}
				await tx.insert(envelopeAttachmentPacketRecipients).values(
					packet.warmWraps.map((w) => ({
						packetRowId: packetRow.id,
						email: w.email.trim().toLowerCase(),
						emailCommitment: hashNormalizedSignerEmail(w.email),
						deliveryKind: "warm" as const,
						kemCiphertext: w.kemCiphertext as Hex,
						encryptedPacketDek: w.encryptedPacketDek as Hex,
					})),
				);
			}

			if (packet.releaseMode === "review") {
				const reviewOnly = packet.recipientEmails
					.map((e) => e.trim().toLowerCase())
					.filter((email) => !wrappedEmails.has(email));
				if (reviewOnly.length > 0) {
					await tx.insert(envelopeAttachmentPacketRecipients).values(
						reviewOnly.map((email) => ({
							packetRowId: packetRow.id,
							email,
							emailCommitment: hashNormalizedSignerEmail(email),
							deliveryKind: "warm" as const,
						})),
					);
				}
			}

			if (packet.coldWraps?.length) {
				const token = args.coldInviteToken?.trim();
				if (!token) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Cold packet wraps require envelope cold invite",
					});
				}
				await tx.insert(envelopeAttachmentPacketColdWraps).values(
					packet.coldWraps.map((c) => ({
						packetRowId: packetRow.id,
						email: c.email.trim().toLowerCase(),
						wrappedPacketDek: c.wrappedPacketDek as Hex,
						inviteToken: token,
					})),
				);
			}

			if (
				packet.releaseMode === "conditional" &&
				packet.onChainRuleId != null &&
				packet.onChainRuleId !== "" &&
				packet.releaseContractAddress &&
				packet.packetContentHash
			) {
				await tx.insert(attachmentReleaseRules).values({
					packetRowId: packetRow.id,
					filePieceCid: args.pieceCid,
					onChainRuleId: BigInt(packet.onChainRuleId),
					releaseContractAddress: getAddress(packet.releaseContractAddress),
					packetContentHash: packet.packetContentHash as Hex,
				});
			}
		}
	});
}
