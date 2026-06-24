import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { isPaidCheckoutPlanId } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import type { SQL } from "drizzle-orm";
import { and, count, eq, ilike, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import type { BillingInterval } from "@/lib/domains/billing/billing";
import {
	type CheckoutIntentPlanId,
	createCheckoutIntentAndEmail,
	resolveCheckoutSeatCount,
} from "@/lib/domains/billing/checkout-intents";
import { assertMarketingCheckoutAllowed } from "@/lib/domains/billing/utils/marketing";
import { emitPlatformAccessRequestPing } from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { accessRequests } from "@/lib/platform/db/schema/platform-access";
import { adminListMeta, adminListOffset } from "./utils/admin-pagination";
import { normalizeEmail } from "./utils/shared";

function resolvePaidCheckoutPlanId(
	planId: string | null | undefined,
): CheckoutIntentPlanId | undefined {
	if (planId && isPaidCheckoutPlanId(planId)) {
		return planId;
	}
	return undefined;
}

function resolveBillingInterval(
	interval: string | null | undefined,
): BillingInterval {
	return interval === "monthly" ? "monthly" : "yearly";
}

export async function submitAccessRequest(args: {
	email: string;
	name?: string | null;
	company?: string | null;
	message?: string | null;
	planId?: PlanId | null;
	interval?: BillingInterval | null;
	seatCount?: number | null;
}): Promise<{ ok: true }> {
	const email = normalizeEmail(args.email);
	if (!email) {
		throw new ORPCError("BAD_REQUEST" /* error-audit-allow */, {
			message: "Email is required",
		});
	}

	const planId = resolvePaidCheckoutPlanId(args.planId);
	const billingInterval = args.interval
		? resolveBillingInterval(args.interval)
		: null;
	const seatCount =
		planId !== undefined
			? resolveCheckoutSeatCount({
					planId,
					seatCount: args.seatCount ?? undefined,
				})
			: 1;

	const [existingPending] = await db
		.select({ id: accessRequests.id })
		.from(accessRequests)
		.where(
			and(
				eq(accessRequests.email, email),
				eq(accessRequests.status, "pending"),
			),
		)
		.limit(1);

	const values = {
		name: args.name?.trim() || null,
		company: args.company?.trim() || null,
		message: args.message?.trim() || null,
		planId: planId ?? null,
		billingInterval,
		seatCount,
		updatedAt: new Date(),
	};

	if (existingPending) {
		await db
			.update(accessRequests)
			.set(values)
			.where(eq(accessRequests.id, existingPending.id));
		return { ok: true };
	}

	await db.insert(accessRequests).values({
		email,
		...values,
	});

	void emitPlatformAccessRequestPing({
		email,
		name: values.name,
		company: values.company,
		message: values.message,
		planId: values.planId,
		billingInterval: values.billingInterval,
		seatCount: values.seatCount,
	});

	return { ok: true };
}

export async function listAccessRequestsForAdmin(args?: {
	page?: number;
	q?: string;
	status?: "all" | "pending" | "approved" | "rejected";
}) {
	const { safePage, offset, pageSize } = adminListOffset(args?.page);
	const filters: SQL[] = [];

	const q = args?.q?.trim();
	if (q) {
		filters.push(ilike(accessRequests.email, `%${q}%`));
	}

	const status = args?.status ?? "all";
	if (status !== "all") {
		filters.push(eq(accessRequests.status, status));
	}

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [countRow] = await db
		.select({ total: count() })
		.from(accessRequests)
		.where(where);

	const totalCount = countRow?.total ?? 0;
	const meta = adminListMeta(totalCount, safePage);

	const rows = await db
		.select({
			id: accessRequests.id,
			email: accessRequests.email,
			name: accessRequests.name,
			company: accessRequests.company,
			message: accessRequests.message,
			planId: accessRequests.planId,
			billingInterval: accessRequests.billingInterval,
			seatCount: accessRequests.seatCount,
			status: accessRequests.status,
			reviewedAt: accessRequests.reviewedAt,
			createdInviteId: accessRequests.createdInviteId,
			createdCheckoutIntentId: accessRequests.createdCheckoutIntentId,
			createdAt: accessRequests.createdAt,
		})
		.from(accessRequests)
		.where(where)
		.orderBy(sql`${accessRequests.createdAt} desc`)
		.limit(pageSize)
		.offset(offset);

	const items = rows.map((row) => ({
		...row,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	}));

	return { items, ...meta };
}

export async function approveAccessRequest(args: {
	adminWallet: Address;
	requestId: string;
	planId?: CheckoutIntentPlanId;
	interval?: BillingInterval;
	seatCount?: number;
}): Promise<{ ok: true }> {
	const [request] = await db
		.select()
		.from(accessRequests)
		.where(eq(accessRequests.id, args.requestId))
		.limit(1);

	if (!request || request.status !== "pending") {
		throwAppError("WORKSPACE.PLATFORM_ACCESS_REQUEST_NOT_FOUND");
	}

	const planId =
		args.planId ?? resolvePaidCheckoutPlanId(request.planId) ?? undefined;
	if (!planId) {
		throw new ORPCError("BAD_REQUEST" /* error-audit-allow */, {
			message: "Access request must include a paid plan before approval",
		});
	}

	const interval =
		args.interval ?? resolveBillingInterval(request.billingInterval);
	const seatCount = resolveCheckoutSeatCount({
		planId,
		seatCount: args.seatCount ?? request.seatCount ?? undefined,
	});

	await assertMarketingCheckoutAllowed({
		email: normalizeEmail(request.email),
		planId,
	});

	const { checkoutIntentId } = await createCheckoutIntentAndEmail({
		email: request.email,
		planId,
		interval,
		seatCount,
	});

	await db
		.update(accessRequests)
		.set({
			status: "approved",
			reviewedAt: new Date(),
			reviewedByAdminWallet: getAddress(args.adminWallet),
			createdCheckoutIntentId: checkoutIntentId,
			updatedAt: new Date(),
		})
		.where(eq(accessRequests.id, request.id));

	return { ok: true };
}

export async function rejectAccessRequest(args: {
	adminWallet: Address;
	requestId: string;
}): Promise<void> {
	const [request] = await db
		.select({ id: accessRequests.id, status: accessRequests.status })
		.from(accessRequests)
		.where(eq(accessRequests.id, args.requestId))
		.limit(1);

	if (!request || request.status !== "pending") {
		throwAppError("WORKSPACE.PLATFORM_ACCESS_REQUEST_NOT_FOUND");
	}

	await db
		.update(accessRequests)
		.set({
			status: "rejected",
			reviewedAt: new Date(),
			reviewedByAdminWallet: getAddress(args.adminWallet),
			updatedAt: new Date(),
		})
		.where(eq(accessRequests.id, request.id));
}
