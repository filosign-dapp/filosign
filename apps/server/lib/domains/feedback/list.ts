import { count, desc, eq, isNull } from "drizzle-orm";
import db from "@/lib/platform/db";
import { productFeedback } from "@/lib/platform/db/schema/feedback";
import { users } from "@/lib/platform/db/schema/user";

export const FEEDBACK_ADMIN_PAGE_SIZE = 10;

export async function listProductFeedbackForAdmin(page: number) {
	const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
	const offset = (safePage - 1) * FEEDBACK_ADMIN_PAGE_SIZE;

	const where = isNull(productFeedback.deletedAt);

	const [countRow] = await db
		.select({ total: count() })
		.from(productFeedback)
		.where(where);

	const totalCount = countRow?.total ?? 0;
	const totalPages =
		totalCount === 0 ? 0 : Math.ceil(totalCount / FEEDBACK_ADMIN_PAGE_SIZE);

	const rows = await db
		.select({
			id: productFeedback.id,
			walletAddress: productFeedback.walletAddress,
			userEmail: users.email,
			featureArea: productFeedback.featureArea,
			route: productFeedback.route,
			rating: productFeedback.rating,
			message: productFeedback.message,
			promptType: productFeedback.promptType,
			trigger: productFeedback.trigger,
			createdAt: productFeedback.createdAt,
		})
		.from(productFeedback)
		.leftJoin(users, eq(productFeedback.walletAddress, users.walletAddress))
		.where(where)
		.orderBy(desc(productFeedback.createdAt))
		.limit(FEEDBACK_ADMIN_PAGE_SIZE)
		.offset(offset);

	return {
		items: rows.map((row) => ({
			id: row.id,
			walletAddress: row.walletAddress,
			userEmail: row.userEmail,
			featureArea: row.featureArea,
			route: row.route,
			rating: row.rating,
			message: row.message,
			promptType: row.promptType,
			trigger: row.trigger,
			createdAt: row.createdAt.toISOString(),
		})),
		page: safePage,
		pageSize: FEEDBACK_ADMIN_PAGE_SIZE,
		totalCount,
		totalPages,
	};
}
