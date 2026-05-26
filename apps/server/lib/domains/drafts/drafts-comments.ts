import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import { assertCanReadDraft, loadDraftOrThrow } from "./access";

const { draftComments } = db.schema;

const zCommentAppendBody = z.object({
	draftId: z.uuid(),
	commentId: z.uuid(),
	ciphertext: zHexString(),
	inviteToken: z.string().min(8).optional(),
});

export async function draftsCommentsList(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	draftId: string,
) {
	const draft = await loadDraftOrThrow(draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertCanReadDraft({ wallet, draft, activeOrg });

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_comments");

	const comments = await db
		.select({
			id: draftComments.id,
			authorWallet: draftComments.authorWallet,
			inviteToken: draftComments.inviteToken,
			ciphertext: draftComments.ciphertext,
			createdAt: draftComments.createdAt,
		})
		.from(draftComments)
		.where(eq(draftComments.draftId, draft.id))
		.orderBy(draftComments.createdAt);

	return { comments };
}

export async function draftsCommentsAppend(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zCommentAppendBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertCanReadDraft({ wallet, draft, activeOrg });

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_comments");

	const [row] = await db
		.insert(draftComments)
		.values({
			id: parsed.data.commentId,
			draftId: draft.id,
			authorWallet: getAddress(wallet),
			inviteToken: parsed.data.inviteToken ?? null,
			ciphertext: parsed.data.ciphertext,
		})
		.returning({
			id: draftComments.id,
			createdAt: draftComments.createdAt,
		});

	return { comment: row };
}
