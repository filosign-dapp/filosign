import { and, eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { envelopeAttachmentPackets } = db.schema;

export async function listConditionalAttachmentPacketsForSender(
	pieceCid: string,
) {
	const rows = await db
		.select({
			packetId: envelopeAttachmentPackets.packetId,
			label: envelopeAttachmentPackets.label,
			onChainRuleId: envelopeAttachmentPackets.onChainRuleId,
			releaseContractAddress: envelopeAttachmentPackets.releaseContractAddress,
		})
		.from(envelopeAttachmentPackets)
		.where(
			and(
				eq(envelopeAttachmentPackets.filePieceCid, pieceCid),
				eq(envelopeAttachmentPackets.releaseMode, "conditional"),
			),
		);

	const out: Array<{
		packetId: string;
		label: string | null;
		onChainRuleId: string;
		releaseContractAddress: `0x${string}`;
		released: boolean;
		cancelled: boolean;
	}> = [];

	for (const row of rows) {
		if (row.onChainRuleId == null || !row.releaseContractAddress) continue;
		const release = fsAttachmentReleaseAt(row.releaseContractAddress);
		if (!release) continue;
		const ruleRes = await tryCatch(release.read.rules([row.onChainRuleId]));
		const released = !ruleRes.error && ruleRes.data[8];
		const cancelled = !ruleRes.error && ruleRes.data[9];
		out.push({
			packetId: row.packetId,
			label: row.label,
			onChainRuleId: row.onChainRuleId.toString(),
			releaseContractAddress: row.releaseContractAddress,
			released,
			cancelled,
		});
	}

	return out;
}
