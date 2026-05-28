import { ORPCError } from "@orpc/server";
import DodoPayments from "dodopayments";
import { and, eq } from "drizzle-orm";
import { getAddress } from "viem";
import env from "@/env";
import db from "@/lib/platform/db";
import {
	type BillingWebhookEventStatus,
	billingWebhookEvents,
	userSubscriptions,
} from "@/lib/platform/db/schema/billing";
import { logger } from "@/lib/platform/pino";
import { resolvePlanIdFromProductId, shouldDowngradeToFree } from "./policy";
import {
	assertTimestampWithinTolerance,
	parseOptionalDate,
	parseWebhookTimestamp,
} from "./webhook-security";

type DodoWebhookEvent = {
	type?: string;
	event_type?: string;
	data?: {
		subscription_id?: string;
		status?: string;
		product_id?: string;
		customer_id?: string;
		customer?: {
			customer_id?: string;
		};
		metadata?: Record<string, unknown>;
		next_billing_date?: string;
		previous_billing_date?: string;
		cancel_at_next_billing_date?: boolean;
	};
};

const SUPPORTED_SUBSCRIPTION_EVENTS = new Set([
	"subscription.active",
	"subscription.renewed",
	"subscription.updated",
	"subscription.on_hold",
	"subscription.failed",
	"subscription.cancelled",
	"subscription.expired",
]);

function createDodoClient() {
	if (!env.DODO_API_KEY) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Dodo Payments is not configured",
		});
	}

	return new DodoPayments({
		bearerToken: env.DODO_API_KEY,
		webhookKey: env.DODO_WEBHOOK_KEY,
		environment: env.DODO_LIVE ? "live_mode" : "test_mode",
	});
}

function mapDodoStatus(
	status: string | undefined,
): "active" | "incomplete" | "past_due" | "canceled" {
	switch (status) {
		case "active":
			return "active";
		case "on_hold":
			return "past_due";
		case "failed":
		case "pending":
			return "incomplete";
		case "cancelled":
		case "expired":
			return "canceled";
		default:
			return "incomplete";
	}
}

function extractEventType(event: DodoWebhookEvent) {
	return event.type ?? event.event_type ?? "";
}

type WebhookHeaders = {
	"webhook-id": string;
	"webhook-signature": string;
	"webhook-timestamp": string;
};

function extractWalletFromMetadata(
	metadata: Record<string, unknown> | undefined,
): `0x${string}` | null {
	const wallet = metadata?.filosign_wallet;
	if (typeof wallet !== "string" || wallet.length === 0) return null;
	try {
		return getAddress(wallet);
	} catch {
		return null;
	}
}

async function markEventStatus(
	providerEventId: string,
	status: BillingWebhookEventStatus,
	lastError?: string,
) {
	await db
		.update(billingWebhookEvents)
		.set({
			status,
			lastError: lastError ?? null,
			processedAt: status === "processed" ? new Date() : null,
			updatedAt: new Date(),
		})
		.where(eq(billingWebhookEvents.providerEventId, providerEventId));
}

export type DodoWebhookEnvelope = DodoWebhookEvent;

export function verifyDodoWebhookSignature(args: {
	rawBody: string;
	webhookId: string;
	webhookTimestamp: string;
	webhookSignature: string;
}) {
	assertTimestampWithinTolerance(args.webhookTimestamp);

	const client = createDodoClient();
	try {
		client.webhooks.unwrap(args.rawBody, {
			headers: {
				"webhook-id": args.webhookId,
				"webhook-signature": args.webhookSignature,
				"webhook-timestamp": args.webhookTimestamp,
			},
		});
		return true;
	} catch {
		return false;
	}
}

export async function handleDodoWebhook(args: {
	rawBody: string;
	webhookId: string;
	webhookTimestamp: string;
	webhookSignature: string;
}) {
	const headers: WebhookHeaders = {
		"webhook-id": args.webhookId,
		"webhook-signature": args.webhookSignature,
		"webhook-timestamp": args.webhookTimestamp,
	};

	const client = createDodoClient();
	let event: DodoWebhookEvent;
	try {
		event = client.webhooks.unwrap(args.rawBody, {
			headers,
		}) as DodoWebhookEvent;
		assertTimestampWithinTolerance(args.webhookTimestamp);
	} catch (error) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Invalid Dodo webhook signature",
			cause: error,
		});
	}

	const eventType = extractEventType(event);
	if (!SUPPORTED_SUBSCRIPTION_EVENTS.has(eventType)) {
		return { ok: true, ignored: true };
	}

	const deliveryTimestamp = parseWebhookTimestamp(args.webhookTimestamp);
	const payloadData = event.data ?? {};
	const dodoSubscriptionId = payloadData.subscription_id ?? null;
	const dodoCustomerId =
		payloadData.customer?.customer_id ?? payloadData.customer_id ?? null;
	const metadataWallet = extractWalletFromMetadata(payloadData.metadata);
	const mappedPlan = resolvePlanIdFromProductId(payloadData.product_id);

	if (!mappedPlan && !shouldDowngradeToFree(eventType)) {
		logger.error(
			{
				eventType,
				productId: payloadData.product_id,
				webhookId: args.webhookId,
			},
			"unknown dodo product id",
		);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Unknown Dodo product id",
		});
	}

	const existing = await db
		.select({
			status: billingWebhookEvents.status,
		})
		.from(billingWebhookEvents)
		.where(eq(billingWebhookEvents.providerEventId, args.webhookId))
		.limit(1);

	if (existing[0]?.status === "processed") {
		return { ok: true, deduped: true };
	}

	if (!existing[0]) {
		await db.insert(billingWebhookEvents).values({
			provider: "dodo",
			providerEventId: args.webhookId,
			eventType,
			status: "received",
			deliveryTimestamp,
			payloadJson: event,
		});
	}

	try {
		await db.transaction(async (tx) => {
			let walletAddress: `0x${string}` | null = null;

			if (dodoCustomerId) {
				const [subByCustomer] = await tx
					.select({ walletAddress: userSubscriptions.walletAddress })
					.from(userSubscriptions)
					.where(
						and(
							eq(userSubscriptions.provider, "dodo"),
							eq(userSubscriptions.dodoCustomerId, dodoCustomerId),
						),
					)
					.limit(1);
				walletAddress = subByCustomer?.walletAddress ?? null;
			}

			if (!walletAddress && metadataWallet) {
				walletAddress = metadataWallet;
			}

			if (!walletAddress) {
				throw new Error("Unable to resolve wallet for webhook");
			}

			const planId = shouldDowngradeToFree(eventType) ? "free" : mappedPlan;
			if (!planId) {
				throw new Error("Unable to resolve plan for webhook");
			}

			await tx
				.insert(userSubscriptions)
				.values({
					walletAddress,
					provider: "dodo",
					planId,
					status: mapDodoStatus(payloadData.status),
					periodStart:
						parseOptionalDate(payloadData.previous_billing_date) ?? new Date(),
					periodEnd: parseOptionalDate(payloadData.next_billing_date),
					cancelAtPeriodEnd: Boolean(payloadData.cancel_at_next_billing_date),
					dodoCustomerId: dodoCustomerId ?? undefined,
					dodoSubscriptionId: dodoSubscriptionId ?? undefined,
				})
				.onConflictDoUpdate({
					target: userSubscriptions.walletAddress,
					set: {
						provider: "dodo",
						planId,
						status: mapDodoStatus(payloadData.status),
						periodStart:
							parseOptionalDate(payloadData.previous_billing_date) ?? undefined,
						periodEnd: parseOptionalDate(payloadData.next_billing_date),
						cancelAtPeriodEnd: Boolean(payloadData.cancel_at_next_billing_date),
						dodoCustomerId: dodoCustomerId ?? undefined,
						dodoSubscriptionId: dodoSubscriptionId ?? undefined,
						updatedAt: new Date(),
					},
				});
		});
		await markEventStatus(args.webhookId, "processed");
		return { ok: true };
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Unknown webhook processing error";
		await markEventStatus(args.webhookId, "failed", message);
		logger.error(
			{ webhookId: args.webhookId, eventType, error: message },
			"failed to process dodo webhook",
		);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to process webhook event",
		});
	}
}
