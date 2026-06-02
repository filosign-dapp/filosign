import type { PlanId } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import { and, eq, gt } from "drizzle-orm";
import {
	type BillingInterval,
	resolveProductId,
} from "@/lib/domains/billing/billing";
import {
	createDodoClient,
	isOrgBillingPlanId,
	requireDodoApiKey,
} from "@/lib/domains/billing/utils/policy";
import {
	generatePlatformInviteToken,
	generateSetupToken,
} from "@/lib/domains/platform-access";
import db from "@/lib/platform/db";
import { checkoutIntents } from "@/lib/platform/db/schema/platform-access";
import {
	getAstroUrl,
	getClientUrl,
	getServerUrl,
	sendCheckoutContinueEmail,
	sendPaidSetupEmail,
} from "@/lib/platform/email";

const CHECKOUT_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

const CHECKOUT_PLAN_IDS = [
	"individual",
	"teams",
	"teams_pro",
] as const satisfies PlanId[];

export type CheckoutIntentPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function planLabel(planId: PlanId): string {
	switch (planId) {
		case "teams_pro":
			return "Teams Pro";
		case "teams":
			return "Teams";
		case "individual":
			return "Individual";
		default:
			return planId;
	}
}

function createCheckoutDodoClient() {
	requireDodoApiKey();
	return createDodoClient({ includeWebhookKey: false });
}

async function createLockedEmailCheckoutSession(args: {
	email: string;
	planId: CheckoutIntentPlanId;
	interval: BillingInterval;
	setupToken: string;
	checkoutIntentId: string;
	seatCount: number;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
	const productId = resolveProductId(args.planId, args.interval);
	const client = createCheckoutDodoClient();
	const returnUrl = `${getClientUrl()}/?setup=${encodeURIComponent(args.setupToken)}`;
	const cancelUrl = `${getAstroUrl()}/pricing`;

	let checkout: {
		session_id: string;
		url?: string | null;
		checkout_url?: string | null;
	};
	try {
		checkout = (await client.checkoutSessions.create({
			product_cart: [{ product_id: productId, quantity: args.seatCount }],
			customer: {
				email: args.email,
			},
			feature_flags: {
				allow_customer_editing_email: false,
				redirect_immediately: true,
			},
			return_url: returnUrl,
			cancel_url: cancelUrl,
			metadata: {
				filosign_setup_token: args.setupToken,
				filosign_checkout_intent_id: args.checkoutIntentId,
				filosign_plan_id: args.planId,
				filosign_interval: args.interval,
				filosign_seat_count: String(args.seatCount),
			},
		})) as {
			session_id: string;
			url?: string | null;
			checkout_url?: string | null;
		};
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create Dodo checkout session",
			cause: error,
		});
	}

	const checkoutUrl = checkout.url ?? checkout.checkout_url;
	if (!checkoutUrl) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Dodo checkout URL was not returned",
		});
	}

	return { checkoutUrl, sessionId: checkout.session_id };
}

function resolveCheckoutSeatCount(args: {
	planId: CheckoutIntentPlanId;
	seatCount?: number;
}): number {
	const seatCount = args.seatCount ?? 1;
	if (!Number.isInteger(seatCount) || seatCount < 1) {
		throw new ORPCError("BAD_REQUEST", {
			message: "seatCount must be a positive integer",
		});
	}
	if (!isOrgBillingPlanId(args.planId) && seatCount !== 1) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Individual checkout supports one seat only",
		});
	}
	return seatCount;
}

export async function requestCheckoutLink(args: {
	email: string;
	planId: CheckoutIntentPlanId;
	interval: BillingInterval;
	seatCount?: number;
}): Promise<{ ok: true }> {
	const email = normalizeEmail(args.email);
	const seatCount = resolveCheckoutSeatCount({
		planId: args.planId,
		seatCount: args.seatCount,
	});
	const continueToken = generatePlatformInviteToken();
	const setupToken = generateSetupToken();
	const expiresAt = new Date(Date.now() + CHECKOUT_INTENT_TTL_MS);

	const [row] = await db
		.insert(checkoutIntents)
		.values({
			continueToken,
			setupToken,
			email,
			planId: args.planId,
			billingInterval: args.interval,
			seatCount,
			expiresAt,
		})
		.returning({ id: checkoutIntents.id });

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create checkout intent",
		});
	}

	const continueUrl = `${getServerUrl()}/checkout/continue?token=${encodeURIComponent(continueToken)}`;
	await sendCheckoutContinueEmail({
		to: email,
		continueUrl,
		planLabel: planLabel(args.planId),
	});

	return { ok: true };
}

export async function continueCheckoutFromToken(args: {
	token: string;
}): Promise<{ checkoutUrl: string }> {
	const token = args.token.trim();
	if (token.length < 8) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid checkout link" });
	}

	const [intent] = await db
		.select()
		.from(checkoutIntents)
		.where(
			and(
				eq(checkoutIntents.continueToken, token),
				gt(checkoutIntents.expiresAt, new Date()),
			),
		)
		.limit(1);

	if (!intent || intent.status === "expired" || intent.status === "completed") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Checkout link not found or expired",
		});
	}

	if (intent.dodoSessionId && intent.status === "checkout_open") {
		const client = createCheckoutDodoClient();
		try {
			const session = (await client.checkoutSessions.retrieve(
				intent.dodoSessionId,
			)) as { checkout_url?: string | null; url?: string | null };
			const existingUrl = session.checkout_url ?? session.url;
			if (existingUrl) {
				return { checkoutUrl: existingUrl };
			}
		} catch {
			// Fall through to create a fresh session.
		}
	}

	const { checkoutUrl, sessionId } = await createLockedEmailCheckoutSession({
		email: normalizeEmail(intent.email),
		planId: intent.planId as CheckoutIntentPlanId,
		interval: intent.billingInterval as BillingInterval,
		setupToken: intent.setupToken,
		checkoutIntentId: intent.id,
		seatCount: intent.seatCount,
	});

	await db
		.update(checkoutIntents)
		.set({
			status: "checkout_open",
			dodoSessionId: sessionId,
			updatedAt: new Date(),
		})
		.where(eq(checkoutIntents.id, intent.id));

	return { checkoutUrl };
}

export async function resendPaidSetupLink(args: {
	email: string;
}): Promise<{ ok: true }> {
	const email = normalizeEmail(args.email);
	if (!email) {
		throw new ORPCError("BAD_REQUEST", { message: "Email is required" });
	}

	const { platformAccessPending } = db.schema;
	const [pending] = await db
		.select({
			setupToken: platformAccessPending.setupToken,
			planId: platformAccessPending.planId,
		})
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.email, email),
				eq(platformAccessPending.status, "pending_wallet"),
				gt(platformAccessPending.expiresAt, new Date()),
			),
		)
		.limit(1);

	if (!pending) {
		throw new ORPCError("NOT_FOUND", {
			message:
				"No pending setup found for this email. Check your inbox or contact support.",
		});
	}

	const setupUrl = `${getClientUrl()}/?setup=${encodeURIComponent(pending.setupToken)}`;
	await sendPaidSetupEmail({
		to: email,
		setupUrl,
		planLabel: planLabel(pending.planId as PlanId),
	});

	return { ok: true };
}

/** Mark intent completed once webhook confirms payment. */
export async function markCheckoutIntentCompleted(args: {
	checkoutIntentId: string | null;
}): Promise<void> {
	if (!args.checkoutIntentId) return;
	await db
		.update(checkoutIntents)
		.set({ status: "completed", updatedAt: new Date() })
		.where(eq(checkoutIntents.id, args.checkoutIntentId));
}

export { CHECKOUT_PLAN_IDS, planLabel as checkoutPlanLabel };
