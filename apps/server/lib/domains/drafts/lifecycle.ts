import { throwAppError } from "@filosign/errors/server";
import { draftSnapshotKey } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	type ActiveOrgContext,
	assertOrgPermission,
	orgRoleHasPermission,
} from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const {
	envelopeDrafts,
	envelopeDraftDocuments,
	draftExternalShares,
	organizationMembers,
} = db.schema;

export type DraftRow = typeof envelopeDrafts.$inferSelect;

export async function loadDraftOrThrow(draftId: string): Promise<DraftRow> {
	const [row] = await db
		.select()
		.from(envelopeDrafts)
		.where(eq(envelopeDrafts.id, draftId))
		.limit(1);
	if (!row) {
		throwAppError("DRAFTS.NOT_FOUND");
	}
	return row;
}

export async function assertDraftCreator(
	wallet: Address,
	draft: DraftRow,
): Promise<void> {
	if (getAddress(draft.createdByWallet) !== getAddress(wallet)) {
		throwAppError("DRAFTS.FORBIDDEN");
	}
}

export async function assertCanReadDraft(args: {
	wallet: Address;
	draft: DraftRow;
	activeOrg: ActiveOrgContext;
}): Promise<void> {
	const walletNorm = getAddress(args.wallet);
	if (getAddress(args.draft.createdByWallet) === walletNorm) return;

	if (args.activeOrg.organizationId !== args.draft.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	assertOrgPermission(args.activeOrg, "drafts:read");
	const [member] = await db
		.select({ role: organizationMembers.role })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, args.draft.organizationId),
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.status, "active"),
			),
		)
		.limit(1);
	if (!member || !orgRoleHasPermission(member.role, "drafts:read")) {
		throwAppError("DRAFTS.FORBIDDEN");
	}
}

export async function listDraftsForWallet(args: {
	wallet: Address;
	organizationId: string;
}) {
	return db
		.select({
			id: envelopeDrafts.id,
			organizationId: envelopeDrafts.organizationId,
			title: envelopeDrafts.title,
			status: envelopeDrafts.status,
			revision: envelopeDrafts.revision,
			createdByWallet: envelopeDrafts.createdByWallet,
			createdAt: envelopeDrafts.createdAt,
			updatedAt: envelopeDrafts.updatedAt,
			sentPieceCid: envelopeDrafts.sentPieceCid,
		})
		.from(envelopeDrafts)
		.where(
			and(
				eq(envelopeDrafts.organizationId, args.organizationId),
				eq(envelopeDrafts.status, "active"),
			),
		)
		.orderBy(desc(envelopeDrafts.updatedAt));
}

export const zDraftCreateBody = z.object({
	title: z.string().min(1).max(200).optional(),
});

export const zDraftMarkSentBody = z.object({
	draftId: z.uuid(),
	pieceCid: z.string().min(1),
});

const zArchiveBody = z.object({
	draftId: z.uuid(),
});

export async function draftsCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftCreateBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const organizationId = activeOrg.organizationId;

	const draftId = randomUuidV7();
	const snapshotKey = draftSnapshotKey({
		draftId,
		organizationId,
	});

	const [row] = await db
		.insert(envelopeDrafts)
		.values({
			id: draftId,
			organizationId,
			createdByWallet: getAddress(wallet),
			title: parsed.data.title?.trim() || "Untitled draft",
			status: "active",
			revision: 0,
			headSnapshotS3Key: snapshotKey,
		})
		.returning();

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Draft not created",
		});
	}

	const uploadUrl = bucket.presign(snapshotKey, {
		method: "PUT",
		expiresIn: 60 * 15,
		type: "application/octet-stream",
	});

	return {
		draft: {
			id: row.id,
			organizationId: row.organizationId,
			title: row.title,
			revision: row.revision,
			status: row.status,
			createdByWallet: row.createdByWallet,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		},
		snapshot: {
			s3Key: snapshotKey,
			uploadUrl,
		},
	};
}

export async function draftsList(wallet: Address, activeOrg: ActiveOrgContext) {
	assertOrgPermission(activeOrg, "drafts:read");
	const organizationId = activeOrg.organizationId;

	const drafts = await listDraftsForWallet({
		wallet,
		organizationId,
	});

	return { drafts };
}

export async function draftsGet(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	draftId: string,
) {
	assertOrgPermission(activeOrg, "drafts:read");
	const draft = await loadDraftOrThrow(draftId);
	await assertCanReadDraft({ wallet, draft, activeOrg });
	if (draft.status === "archived") {
		throwAppError("DRAFTS.NOT_FOUND");
	}

	if (!draft.headSnapshotS3Key) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Draft has no saved content",
					path: ["headSnapshotS3Key"],
				},
			]),
		);
	}

	const documents = await db
		.select({
			docId: envelopeDraftDocuments.docId,
			s3Key: envelopeDraftDocuments.s3Key,
			name: envelopeDraftDocuments.name,
			size: envelopeDraftDocuments.size,
			mimeType: envelopeDraftDocuments.mimeType,
		})
		.from(envelopeDraftDocuments)
		.where(eq(envelopeDraftDocuments.draftId, draft.id));

	const snapshotDownloadUrl = bucket.presign(draft.headSnapshotS3Key, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	const documentDownloads = documents.map((doc) => ({
		...doc,
		downloadUrl: bucket.presign(doc.s3Key, {
			method: "GET",
			expiresIn: 60 * 5,
		}),
	}));

	return {
		draft: {
			id: draft.id,
			organizationId: draft.organizationId,
			title: draft.title,
			status: draft.status,
			revision: draft.revision,
			createdByWallet: draft.createdByWallet,
			sentPieceCid: draft.sentPieceCid,
			createdAt: draft.createdAt,
			updatedAt: draft.updatedAt,
		},
		headDekWrappedOmk: draft.headDekWrappedOmk,
		headOmkKemCiphertext: draft.headOmkKemCiphertext,
		snapshot: {
			s3Key: draft.headSnapshotS3Key,
			downloadUrl: snapshotDownloadUrl,
		},
		documents: documentDownloads,
	};
}

export async function draftsMarkSent(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftMarkSentBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throwAppError("DRAFTS.NOT_EDITABLE");
	}

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.update(envelopeDrafts)
			.set({
				status: "sent",
				sentPieceCid: parsed.data.pieceCid,
				updatedAt: now,
			})
			.where(eq(envelopeDrafts.id, draft.id));

		await tx
			.update(draftExternalShares)
			.set({ revokedAt: now, updatedAt: now })
			.where(
				and(
					eq(draftExternalShares.draftId, draft.id),
					isNull(draftExternalShares.revokedAt),
				),
			);
	});

	return { ok: true as const };
}

export async function draftsArchive(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zArchiveBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throwAppError("DRAFTS.NOT_EDITABLE");
	}

	const now = new Date();
	await db
		.update(envelopeDrafts)
		.set({ status: "archived", updatedAt: now })
		.where(eq(envelopeDrafts.id, draft.id));

	return { ok: true as const };
}
