import { computeCidIdentifier } from "@filosign/contracts";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { attachmentReleaseRuleWhere } from "./utils/rule-lookup";

const { files, envelopeAttachmentPackets, attachmentReleaseRules } = db.schema;

const zLinkBody = z.object({
	pieceCid: z.string().min(8),
	packetId: z.string().min(1),
	onChainRuleId: z.string().regex(/^\d+$/),
	releaseContractAddress: z.string(),
	registerRuleTxHash: z.string(),
	packetContentHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

export async function linkAttachmentPacketOnChainRule(
	sender: Address,
	body: unknown,
) {
	const parsed = zLinkBody.safeParse(body);
	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const input = parsed.data;

	const [file] = await db
		.select({ sender: files.sender })
		.from(files)
		.where(eq(files.pieceCid, input.pieceCid))
		.limit(1);
	if (!file || getAddress(file.sender) !== getAddress(sender)) {
		throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
	}

	const [packet] = await db
		.select({ id: envelopeAttachmentPackets.id })
		.from(envelopeAttachmentPackets)
		.where(
			and(
				eq(envelopeAttachmentPackets.filePieceCid, input.pieceCid),
				eq(envelopeAttachmentPackets.packetId, input.packetId),
			),
		)
		.limit(1);
	if (!packet) {
		throw new ORPCError("NOT_FOUND", { message: "Packet not found" });
	}

	const releaseContractAddress = getAddress(input.releaseContractAddress);
	const onChainRuleId = BigInt(input.onChainRuleId);
	const ruleWhere = attachmentReleaseRuleWhere({
		releaseContractAddress,
		onChainRuleId,
	});

	await db.transaction(async (tx) => {
		await tx
			.update(envelopeAttachmentPackets)
			.set({
				onChainRuleId,
				releaseContractAddress,
				registerRuleTxHash: input.registerRuleTxHash as `0x${string}`,
				releaseMode: "conditional",
			})
			.where(eq(envelopeAttachmentPackets.id, packet.id));

		const [existingRule] = await tx
			.select({ packetRowId: attachmentReleaseRules.packetRowId })
			.from(attachmentReleaseRules)
			.where(ruleWhere)
			.limit(1);

		if (existingRule && existingRule.packetRowId !== packet.id) {
			const release = fsAttachmentReleaseAt(releaseContractAddress);
			if (!release) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Attachment release contract unavailable",
				});
			}
			const ruleRes = await tryCatch(release.read.rules([onChainRuleId]));
			if (ruleRes.error) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Could not verify on-chain attachment rule",
				});
			}
			const onChainCidId = ruleRes.data[0] as Hex;
			const expectedCidId = computeCidIdentifier(input.pieceCid);
			if (onChainCidId !== expectedCidId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "On-chain attachment rule already linked to another packet",
				});
			}

			// Local chain reset reuses rule ids; Postgres may still point at a prior envelope.
			await tx
				.delete(attachmentReleaseRules)
				.where(
					eq(attachmentReleaseRules.packetRowId, existingRule.packetRowId),
				);
			await tx
				.update(envelopeAttachmentPackets)
				.set({
					onChainRuleId: null,
					releaseContractAddress: null,
					registerRuleTxHash: null,
				})
				.where(eq(envelopeAttachmentPackets.id, existingRule.packetRowId));
		} else if (existingRule) {
			await tx
				.update(attachmentReleaseRules)
				.set({
					packetContentHash: input.packetContentHash as `0x${string}`,
					filePieceCid: input.pieceCid,
				})
				.where(ruleWhere);
			return;
		}

		await tx.insert(attachmentReleaseRules).values({
			packetRowId: packet.id,
			filePieceCid: input.pieceCid,
			onChainRuleId,
			releaseContractAddress,
			packetContentHash: input.packetContentHash as `0x${string}`,
		});
	});

	return { ok: true as const };
}
