import { check } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { computeCidIdentifier } from "@filosign/evm";
import {
	type EnvelopeColdInviteRef,
	SUPPLEMENTARY_ATTACHMENT_LIMITS,
	validateAttachmentPacketsForSend,
	zAttachmentPacketSendInput,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import {
	assertCommitmentsOnEnvelopeRoster,
	collectOnChainReleaseSignerCommitments,
} from "@/lib/domains/files/utils/assert-roster-commitments";
import db from "@/lib/platform/db";
import {
	fsAttachmentReleaseAt,
	fsEnvelopeRegistryAt,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import {
	assertAttachmentPacketsExistInStorage,
	insertSingleAttachmentPacket,
} from "./utils/insert-packet";

const { files, envelopeAttachmentPackets, attachmentReleaseRules } = db.schema;
const zAttachmentPacketsRegister = z
	.array(zAttachmentPacketSendInput)
	.max(SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope);

export const zLinkAttachmentOnChainRuleInput = z.object({
	pieceCid: z.string().min(8),
	packetId: z.string().min(1),
	onChainRuleId: z.string().regex(/^\d+$/),
	releaseContractAddress: z.string(),
	registerRuleTxHash: z.string(),
	packetContentHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

function attachmentReleaseRuleWhere(args: {
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

async function assertAttachmentRuleSignersOnRoster(args: {
	pieceCid: string;
	registryAddress: `0x${string}` | null | undefined;
	releaseContractAddress: Address;
	onChainRuleId: bigint;
}) {
	const registry = fsEnvelopeRegistryAt(args.registryAddress ?? null);
	const release = fsAttachmentReleaseAt(args.releaseContractAddress);
	if (!registry || !release) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Could not verify attachment rule against envelope roster",
			},
		});
	}

	const cidId = computeCidIdentifier(args.pieceCid);
	const ruleRes = await tryCatch(release.read.rules([args.onChainRuleId]));
	if (ruleRes.error || !ruleRes.data) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Could not verify on-chain attachment rule",
			},
		});
	}

	const onChainCidId = ruleRes.data[0] as Hex;
	if (onChainCidId !== cidId) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain attachment rule does not match this document",
			},
		});
	}

	const releaseTypeUint = Number(ruleRes.data[4]);
	const specificSignerCommitment = ruleRes.data[5] as Hex;
	const commitmentsRes = await tryCatch(
		release.read.signerCommitments([args.onChainRuleId]),
	);
	if (commitmentsRes.error || !commitmentsRes.data) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Could not read on-chain attachment rule signer commitments",
			},
		});
	}

	await assertCommitmentsOnEnvelopeRoster({
		registry,
		cidId,
		commitments: collectOnChainReleaseSignerCommitments({
			releaseTypeUint,
			specificSignerCommitment,
			signerCommitments: commitmentsRes.data as Hex[],
		}),
	});
}

export async function insertAttachmentPacketsForFile(args: {
	pieceCid: string;
	sender: Address;
	organizationId: string | null;
	packets: unknown;
	rosterEmails: string[];
	coldInvites: EnvelopeColdInviteRef[];
}) {
	const parsed = zAttachmentPacketsRegister.safeParse(args.packets ?? []);
	if (parsed.error) {
		throw throwZodBadRequest(parsed.error);
	}
	if (parsed.data.length === 0) return;

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(args.sender),
		args.organizationId,
	);

	const supplementaryAttachments = check(
		entitlementCtx,
		"features.supplementary_attachments",
	).allowed;
	const recipientSelect = check(
		entitlementCtx,
		"features.supplementary_attachments.recipient_select",
	).allowed;
	const conditionalRelease = check(
		entitlementCtx,
		"features.supplementary_attachments.conditional_release",
	).allowed;

	const validationIssues = validateAttachmentPacketsForSend({
		supplementaryAttachments,
		recipientSelect,
		conditionalRelease,
		packets: parsed.data,
		rosterEmails: args.rosterEmails,
	});
	if (validationIssues.length > 0) {
		const issue = validationIssues[0];
		if (issue?.code === "FEATURE_DISABLED") {
			assertEntitlement(entitlementCtx, "features.supplementary_attachments");
		} else if (issue?.code === "RECIPIENT_SELECT_DISABLED") {
			assertEntitlement(
				entitlementCtx,
				"features.supplementary_attachments.recipient_select",
			);
		} else if (issue?.code === "CONDITIONAL_DISABLED") {
			assertEntitlement(
				entitlementCtx,
				"features.supplementary_attachments.conditional_release",
			);
		}
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: issue?.message ?? "Invalid attachment packets",
					path: ["attachmentPackets"],
				},
			]),
		);
	}

	await assertAttachmentPacketsExistInStorage(parsed.data);

	await db.transaction(async (tx) => {
		for (const packet of parsed.data) {
			await insertSingleAttachmentPacket(tx, {
				pieceCid: args.pieceCid,
				packet,
				coldInvites: args.coldInvites,
			});
		}
	});
}

export async function linkAttachmentPacketOnChainRule(
	sender: Address,
	body: unknown,
) {
	const parsed = zLinkAttachmentOnChainRuleInput.safeParse(body);
	if (parsed.error) {
		throw throwZodBadRequest(parsed.error);
	}
	const input = parsed.data;

	const [file] = await db
		.select({ sender: files.sender, registryAddress: files.registryAddress })
		.from(files)
		.where(eq(files.pieceCid, input.pieceCid))
		.limit(1);
	if (!file || getAddress(file.sender) !== getAddress(sender)) {
		throw throwAppError("ATTACHMENTS.FORBIDDEN");
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
		throw throwAppError("ATTACHMENTS.PACKET_NOT_FOUND");
	}

	const releaseContractAddress = getAddress(input.releaseContractAddress);
	const onChainRuleId = BigInt(input.onChainRuleId);
	const ruleWhere = attachmentReleaseRuleWhere({
		releaseContractAddress,
		onChainRuleId,
	});

	const [existingRuleBeforeTx] = await db
		.select({ packetRowId: attachmentReleaseRules.packetRowId })
		.from(attachmentReleaseRules)
		.where(ruleWhere)
		.limit(1);

	const linkingExistingRuleToSamePacket =
		existingRuleBeforeTx?.packetRowId === packet.id;

	if (!linkingExistingRuleToSamePacket) {
		await assertAttachmentRuleSignersOnRoster({
			pieceCid: input.pieceCid,
			registryAddress: file.registryAddress,
			releaseContractAddress,
			onChainRuleId,
		});
	}

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
				throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
					message: "Attachment release contract unavailable",
				});
			}
			const ruleRes = await tryCatch(release.read.rules([onChainRuleId]));
			if (ruleRes.error) {
				throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
					params: {
						reason: "Could not verify on-chain attachment rule",
					},
				});
			}
			const onChainCidId = ruleRes.data[0] as Hex;
			const expectedCidId = computeCidIdentifier(input.pieceCid);
			if (onChainCidId !== expectedCidId) {
				throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
					params: {
						reason: "On-chain attachment rule already linked to another packet",
					},
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
