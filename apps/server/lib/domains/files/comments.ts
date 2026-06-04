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
import db from "@/lib/platform/db";
import { assertPieceReadAccess } from "./utils/piece-read-access";

const { fileComments } = db.schema;

export const zFileCommentAppendBody = z.object({
	pieceCid: z.string().min(1),
	commentId: z.uuid(),
	ciphertext: zHexString(),
});

export type FileCommentAppendBody = z.infer<typeof zFileCommentAppendBody>;

export async function fileCommentsList(userWallet: Address, pieceCid: string) {
	const { organizationId } = await assertPieceReadAccess(userWallet, pieceCid);

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(userWallet),
		organizationId,
	);
	assertEntitlement(entitlementCtx, "features.comments");

	const comments = await db
		.select({
			id: fileComments.id,
			authorWallet: fileComments.authorWallet,
			ciphertext: fileComments.ciphertext,
			createdAt: fileComments.createdAt,
		})
		.from(fileComments)
		.where(eq(fileComments.filePieceCid, pieceCid))
		.orderBy(fileComments.createdAt);

	return { comments };
}

export async function fileCommentsAppend(
	userWallet: Address,
	body: FileCommentAppendBody,
) {
	const parsed = zFileCommentAppendBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const { organizationId } = await assertPieceReadAccess(
		userWallet,
		parsed.data.pieceCid,
	);

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(userWallet),
		organizationId,
	);
	assertEntitlement(entitlementCtx, "features.comments");

	const [row] = await db
		.insert(fileComments)
		.values({
			id: parsed.data.commentId,
			filePieceCid: parsed.data.pieceCid,
			authorWallet: getAddress(userWallet),
			ciphertext: parsed.data.ciphertext,
		})
		.returning({
			id: fileComments.id,
			createdAt: fileComments.createdAt,
		});

	return { comment: row };
}
