import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { platformAccessPending } from "@/lib/platform/db/schema/platform-access";
import { createDodoClient, requireDodoApiKey } from "./policy";

export type NewWorkspacePendingStatus = {
	ready: boolean;
	abandoned: boolean;
	planId: PlanId;
	expiresAt: string;
};

type DodoCheckoutSession = {
	subscription_id?: string | null;
	status?: string | null;
	customer?: { customer_id?: string | null };
};

const ABANDONED_CHECKOUT_STATUSES = new Set([
	"cancelled",
	"canceled",
	"expired",
	"failed",
]);

function createBillingDodoClient() {
	requireDodoApiKey();
	return createDodoClient({ includeWebhookKey: false });
}

function isAbandonedCheckoutStatus(status: string | null | undefined): boolean {
	if (!status) return false;
	return ABANDONED_CHECKOUT_STATUSES.has(status.trim().toLowerCase());
}

async function loadWalletPendingRow(args: {
	wallet: Address;
	pendingBillingId: string;
}) {
	const wallet = getAddress(args.wallet);
	const [row] = await db
		.select()
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.id, args.pendingBillingId),
				eq(platformAccessPending.linkedWallet, wallet),
				eq(platformAccessPending.status, "linked"),
				isNull(platformAccessPending.linkedOrganizationId),
			),
		)
		.limit(1);
	return row ?? null;
}

async function loadWalletPendingRowForStatus(args: {
	wallet: Address;
	pendingBillingId: string;
}) {
	const wallet = getAddress(args.wallet);
	const [row] = await db
		.select()
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.id, args.pendingBillingId),
				eq(platformAccessPending.linkedWallet, wallet),
				inArray(platformAccessPending.status, ["linked", "expired"]),
				isNull(platformAccessPending.linkedOrganizationId),
			),
		)
		.limit(1);
	return row ?? null;
}

function isPendingReadyForAttach(
	row: {
		dodoSubscriptionId: string | null;
		expiresAt: Date;
		status: string;
	},
	now = new Date(),
): boolean {
	return (
		row.status === "linked" &&
		Boolean(row.dodoSubscriptionId) &&
		row.expiresAt.getTime() > now.getTime()
	);
}

export type ReconcileNewWorkspacePendingResult =
	| "ready"
	| "pending"
	| "abandoned"
	| "unchanged";

/** Poll Dodo when webhook has not written subscription id yet. */
export async function reconcileNewWorkspacePendingFromDodo(args: {
	wallet: Address;
	pendingBillingId: string;
}): Promise<ReconcileNewWorkspacePendingResult> {
	const row = await loadWalletPendingRow(args);
	if (!row) {
		const expiredRow = await loadWalletPendingRowForStatus(args);
		if (expiredRow?.status === "expired" && !expiredRow.dodoSubscriptionId) {
			return "abandoned";
		}
		return "unchanged";
	}

	if (row.dodoSubscriptionId) {
		return "ready";
	}

	if (!row.dodoCheckoutSessionId) {
		return "pending";
	}

	const client = createBillingDodoClient();
	let session: DodoCheckoutSession;
	try {
		session = (await client.checkoutSessions.retrieve(
			row.dodoCheckoutSessionId,
		)) as DodoCheckoutSession;
	} catch {
		return "pending";
	}

	const subscriptionId = session.subscription_id?.trim();
	if (subscriptionId) {
		const customerId = session.customer?.customer_id?.trim() || null;
		await db
			.update(platformAccessPending)
			.set({
				dodoSubscriptionId: subscriptionId,
				...(customerId ? { dodoCustomerId: customerId } : {}),
				updatedAt: new Date(),
			})
			.where(eq(platformAccessPending.id, row.id));
		return "ready";
	}

	if (isAbandonedCheckoutStatus(session.status)) {
		await db
			.update(platformAccessPending)
			.set({
				status: "expired",
				updatedAt: new Date(),
			})
			.where(eq(platformAccessPending.id, row.id));
		return "abandoned";
	}

	return "pending";
}

export async function getNewWorkspacePendingStatus(args: {
	wallet: Address;
	pendingBillingId: string;
}): Promise<NewWorkspacePendingStatus> {
	const reconcileResult = await reconcileNewWorkspacePendingFromDodo(args);

	const row = await loadWalletPendingRowForStatus(args);
	if (!row) {
		throwAppError("WORKSPACE.PAID_PLAN_REQUIRED");
	}

	const abandoned =
		reconcileResult === "abandoned" ||
		(row.status === "expired" && !row.dodoSubscriptionId);

	return {
		ready: isPendingReadyForAttach(row),
		abandoned,
		planId: row.planId as PlanId,
		expiresAt: row.expiresAt.toISOString(),
	};
}
