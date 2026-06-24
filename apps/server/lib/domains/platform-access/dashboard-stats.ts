import { and, count, eq, isNull, or, sql } from "drizzle-orm";
import db from "@/lib/platform/db";
import { productFeedback } from "@/lib/platform/db/schema/feedback";
import {
	accessRequests,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { organizationSettlementFeatureAccess } from "@/lib/platform/db/schema/settlement-access";

export async function getPlatformAdminDashboardStats() {
	const now = new Date();

	const activeInviteExpiry = or(
		isNull(platformInvites.expiresAt),
		sql`${platformInvites.expiresAt} > ${now}`,
	);

	const activeInviteFilter = and(
		isNull(platformInvites.revokedAt),
		sql`${platformInvites.redemptionCount} < ${platformInvites.maxRedemptions}`,
		activeInviteExpiry,
	);

	const [pendingAccessRow, pendingPayoutRow, activeInvitesRow, feedbackRow] =
		await Promise.all([
			db
				.select({ total: count() })
				.from(accessRequests)
				.where(eq(accessRequests.status, "pending")),
			db
				.select({ total: count() })
				.from(organizationSettlementFeatureAccess)
				.where(eq(organizationSettlementFeatureAccess.status, "pending")),
			db
				.select({ total: count() })
				.from(platformInvites)
				.where(activeInviteFilter),
			db
				.select({ total: count() })
				.from(productFeedback)
				.where(isNull(productFeedback.deletedAt)),
		]);

	return {
		pendingAccessRequests: pendingAccessRow[0]?.total ?? 0,
		pendingPayoutAccess: pendingPayoutRow[0]?.total ?? 0,
		activeInvites: activeInvitesRow[0]?.total ?? 0,
		feedbackTotal: feedbackRow[0]?.total ?? 0,
	};
}
