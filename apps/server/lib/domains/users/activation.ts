import {
	ACTIVATION_CATALOG_VERSION,
	type ActivationMilestoneId,
	zActivationMilestoneId,
} from "@filosign/shared";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { z } from "zod";
import env from "@/env";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { files, userActivationMilestones, userActivationState } = db.schema;

export const zUserActivationMarkBody = z.object({
	milestone: zActivationMilestoneId,
});

export async function markActivationMilestone(
	wallet: Address,
	milestone: ActivationMilestoneId,
): Promise<{ inserted: boolean }> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.insert(userActivationMilestones)
		.values({
			walletAddress: walletNorm,
			milestone,
			completedAt: new Date(),
		})
		.onConflictDoNothing({
			target: [
				userActivationMilestones.walletAddress,
				userActivationMilestones.milestone,
			],
		})
		.returning({ milestone: userActivationMilestones.milestone });

	return { inserted: row != null };
}

async function markActivationMilestoneTracked(
	wallet: Address,
	milestone: ActivationMilestoneId,
): Promise<void> {
	const { inserted } = await markActivationMilestone(wallet, milestone);
	if (!inserted) return;

	trackServerEvent({
		distinctId: getAddress(wallet),
		event: SERVER_ANALYTICS_EVENTS.activationMilestoneRecorded,
		properties: {
			milestone,
			deployment: env.DEPLOYMENT,
		},
	});
}

async function listActivationMilestones(
	wallet: Address,
): Promise<ActivationMilestoneId[]> {
	const walletNorm = getAddress(wallet);
	const rows = await db
		.select({ milestone: userActivationMilestones.milestone })
		.from(userActivationMilestones)
		.where(eq(userActivationMilestones.walletAddress, walletNorm));
	return rows.map((row) => row.milestone);
}

async function resolvePracticePieceCid(
	wallet: Address,
): Promise<string | null> {
	const walletNorm = getAddress(wallet);

	const [stateRow] = await db
		.select({ practicePieceCid: userActivationState.practicePieceCid })
		.from(userActivationState)
		.where(eq(userActivationState.walletAddress, walletNorm))
		.limit(1);

	if (stateRow?.practicePieceCid) {
		return stateRow.practicePieceCid;
	}

	const [practiceFile] = await db
		.select({ pieceCid: files.pieceCid })
		.from(files)
		.where(and(eq(files.sender, walletNorm), eq(files.isPractice, true)))
		.orderBy(sql`${files.createdAt} desc`)
		.limit(1);

	return practiceFile?.pieceCid ?? null;
}

export async function userActivationGet(wallet: Address) {
	const milestones = await listActivationMilestones(wallet);
	const practicePieceCid = await resolvePracticePieceCid(wallet);

	return {
		deployment: env.DEPLOYMENT,
		catalogVersion: ACTIVATION_CATALOG_VERSION,
		milestones,
		practicePieceCid,
	};
}

export async function userActivationMark(wallet: Address, rawBody: unknown) {
	const parsed = zUserActivationMarkBody.safeParse(rawBody);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	await markActivationMilestoneTracked(wallet, parsed.data.milestone);
	return {};
}

export async function userActivationRecordPracticePiece(
	wallet: Address,
	pieceCid: string,
): Promise<void> {
	const walletNorm = getAddress(wallet);
	const trimmed = pieceCid.trim();
	if (!trimmed) return;

	await db
		.insert(userActivationState)
		.values({
			walletAddress: walletNorm,
			practicePieceCid: trimmed,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: userActivationState.walletAddress,
			set: {
				practicePieceCid: trimmed,
				updatedAt: new Date(),
			},
		});
}

export async function userActivationOnPracticeSigned(
	wallet: Address,
): Promise<void> {
	await markActivationMilestoneTracked(wallet, "practice_document_signed");
}

export async function userActivationOnRealEnvelopeSent(
	wallet: Address,
): Promise<void> {
	await markActivationMilestoneTracked(wallet, "first_envelope_sent");
}

export async function userActivationOnEnvelopeStarted(
	wallet: Address,
): Promise<void> {
	await markActivationMilestoneTracked(wallet, "first_envelope_started");
}

export async function userActivationOnSignatureReady(
	wallet: Address,
): Promise<void> {
	await markActivationMilestoneTracked(wallet, "signature_created");
}

/** Whether monthly send quota should apply for this upload/register. */
export { shouldEnforceSendQuota } from "./activation-quota";
