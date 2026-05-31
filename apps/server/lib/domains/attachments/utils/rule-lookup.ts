import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";

const { attachmentReleaseRules } = db.schema;

export function attachmentReleaseRuleWhere(args: {
	releaseContractAddress: Address;
	onChainRuleId: bigint;
}) {
	return and(
		eq(
			attachmentReleaseRules.releaseContractAddress,
			getAddress(args.releaseContractAddress),
		),
		eq(attachmentReleaseRules.onChainRuleId, args.onChainRuleId),
	);
}

export async function selectAttachmentReleaseRule(
	onChainRuleId: bigint,
	releaseContractAddress: Address,
) {
	const [row] = await db
		.select()
		.from(attachmentReleaseRules)
		.where(
			attachmentReleaseRuleWhere({
				onChainRuleId,
				releaseContractAddress: getAddress(releaseContractAddress),
			}),
		)
		.limit(1);
	if (!row) {
		throw new ORPCError("NOT_FOUND", {
			message: "Attachment release rule not found",
		});
	}
	return row;
}
