import { DEFAULT_PLAN_ID } from "@filosign/entitlements";
import { and, eq, gt } from "drizzle-orm";
import env from "@/env";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";

const { organizationArchival, organizationSubscriptions } = db.schema;

function addDays(from: Date, days: number): Date {
	const d = new Date(from);
	d.setUTCDate(d.getUTCDate() + days);
	return d;
}

function maxDate(a: Date, b: Date): Date {
	return a.getTime() >= b.getTime() ? a : b;
}

export async function resolveWorkspaceFocRetentionUntil(
	organizationId: string,
): Promise<Date | null> {
	const [sub] = await db
		.select({
			planId: organizationSubscriptions.planId,
			status: organizationSubscriptions.status,
			cancelAtPeriodEnd: organizationSubscriptions.cancelAtPeriodEnd,
			periodEnd: organizationSubscriptions.periodEnd,
		})
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, organizationId))
		.limit(1);

	const effectivePlan = effectivePlanIdFromStatus(
		sub
			? {
					planId: sub.planId,
					status: sub.status,
					cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
					periodEnd: sub.periodEnd,
				}
			: undefined,
	);

	if (effectivePlan === DEFAULT_PLAN_ID) {
		return null;
	}

	const churnGraceDays = env.WORKSPACE_CHURN_GRACE_DAYS ?? 90;
	const now = new Date();

	if (sub?.periodEnd) {
		const effective = effectivePlanIdFromStatus({
			planId: sub.planId,
			status: sub.status,
			cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
			periodEnd: sub.periodEnd,
		});

		if (
			effective !== DEFAULT_PLAN_ID &&
			sub.periodEnd.getTime() > now.getTime()
		) {
			return sub.periodEnd;
		}

		return addDays(sub.periodEnd, churnGraceDays);
	}

	const fallback = new Date(now);
	fallback.setUTCFullYear(fallback.getUTCFullYear() + 1);
	return fallback;
}

/** Archival SKU retention (separate Dodo product); independent of workspace cancel. */
async function resolveArchivalFocRetentionUntil(
	organizationId: string,
): Promise<Date | null> {
	const [archival] = await db
		.select({ retentionUntil: organizationArchival.retentionUntil })
		.from(organizationArchival)
		.where(
			and(
				eq(organizationArchival.organizationId, organizationId),
				eq(organizationArchival.status, "active"),
				gt(organizationArchival.retentionUntil, new Date()),
			),
		)
		.limit(1);

	return archival?.retentionUntil ?? null;
}

/**
 * Effective FOC retention = max(workspace SaaS window, archival window).
 * Archival can outlive workspace cancellation while archival sub stays paid.
 */
export async function resolveFocRetentionUntil(
	organizationId: string,
): Promise<Date> {
	const workspaceUntil =
		await resolveWorkspaceFocRetentionUntil(organizationId);
	const archivalUntil = await resolveArchivalFocRetentionUntil(organizationId);

	if (workspaceUntil && archivalUntil) {
		return maxDate(workspaceUntil, archivalUntil);
	}
	if (archivalUntil) {
		return archivalUntil;
	}
	if (workspaceUntil) {
		return workspaceUntil;
	}

	const fallback = new Date();
	fallback.setUTCFullYear(fallback.getUTCFullYear() + 1);
	return fallback;
}
