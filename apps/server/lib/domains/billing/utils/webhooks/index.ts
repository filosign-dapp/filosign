import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { invalidateOrgEntitlements } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { billingWebhookEvents } from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import {
	enqueueBillingWebhook,
	isBillingWebhookProcessed,
} from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import { createDodoClient, resolvePlanIdFromProductId } from "../policy";
import { webhookAllowsMissingProductId } from "./sync";

function parseDeliveryTimestamp(value: string) {
	const numeric = Number(value);
	if (Number.isFinite(numeric) && numeric > 0) {
		return new Date(numeric * 1000);
	}
	const iso = new Date(value);
	if (!Number.isNaN(iso.getTime())) return iso;
	return null;
}

export function assertTimestampWithinTolerance(
	timestamp: string,
	toleranceMs = 300_000,
) {
	const parsed = parseDeliveryTimestamp(timestamp);
	if (!parsed) {
		throw new ORPCError("UNAUTHORIZED" /* error-audit-allow */, {
			message: "Webhook timestamp is invalid",
		});
	}

	const deltaMs = Math.abs(Date.now() - parsed.getTime());
	if (deltaMs > toleranceMs) {
		throw new ORPCError("UNAUTHORIZED" /* error-audit-allow */, {
			message: "Webhook timestamp is outside tolerance window",
		});
	}
}

export function parseOptionalDate(value: string | undefined): Date | null {
	if (!value) return null;
	const asNumber = Number(value);
	if (Number.isFinite(asNumber) && asNumber > 0)
		return new Date(asNumber * 1000);
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

export function parseWebhookTimestamp(value: string) {
	const parsed = parseDeliveryTimestamp(value);
	return parsed ?? new Date();
}

type DodoWebhookEvent = {
	type?: string;
	event_type?: string;
	data?: {
		subscription_id?: string;
		status?: string;
		product_id?: string;
		quantity?: number;
		customer_id?: string;
		customer?: {
			customer_id?: string;
			email?: string;
		};
		metadata?: Record<string, unknown>;
		next_billing_date?: string;
		previous_billing_date?: string;
		cancel_at_next_billing_date?: boolean;
	};
};

export type DodoWebhookEnvelope = DodoWebhookEvent;

const SUPPORTED_SUBSCRIPTION_EVENTS = new Set([
	"subscription.active",
	"subscription.renewed",
	"subscription.updated",
	"subscription.plan_changed",
	"subscription.on_hold",
	"subscription.failed",
	"subscription.cancelled",
	"subscription.expired",
]);

function extractEventType(event: DodoWebhookEvent) {
	return event.type ?? event.event_type ?? "";
}

type WebhookHeaders = {
	"webhook-id": string;
	"webhook-signature": string;
	"webhook-timestamp": string;
};

function extractOrgIdFromMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	const orgId = metadata?.filosign_org_id;
	return typeof orgId === "string" && orgId.length > 0 ? orgId : null;
}

export function verifyDodoWebhookSignature(args: {
	rawBody: string;
	webhookId: string;
	webhookTimestamp: string;
	webhookSignature: string;
}): boolean {
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

export async function resolveOrgIdForWebhookAck(args: {
	metadataOrgId: string | null;
	dodoSubscriptionId: string | null;
}): Promise<string | null> {
	if (args.metadataOrgId) return args.metadataOrgId;
	if (!args.dodoSubscriptionId) return null;
	const [subByDodo] = await db
		.select({ organizationId: organizationSubscriptions.organizationId })
		.from(organizationSubscriptions)
		.where(
			eq(organizationSubscriptions.dodoSubscriptionId, args.dodoSubscriptionId),
		)
		.limit(1);
	return subByDodo?.organizationId ?? null;
}

function unwrapDodoWebhookEvent(args: {
	rawBody: string;
	webhookId: string;
	webhookTimestamp: string;
	webhookSignature: string;
}): DodoWebhookEvent {
	const headers: WebhookHeaders = {
		"webhook-id": args.webhookId,
		"webhook-signature": args.webhookSignature,
		"webhook-timestamp": args.webhookTimestamp,
	};
	const client = createDodoClient();
	const event = client.webhooks.unwrap(args.rawBody, {
		headers,
	}) as DodoWebhookEvent;
	assertTimestampWithinTolerance(args.webhookTimestamp);
	return event;
}

/**
 * Verify signature, persist `received`, invalidate entitlements, enqueue worker.
 * Returns before heavy subscription sync (Sprint 5).
 */
export async function ackDodoWebhook(args: {
	rawBody: string;
	webhookId: string;
	webhookTimestamp: string;
	webhookSignature: string;
}): Promise<{ ok: true; ignored?: boolean; deduped?: boolean }> {
	let event: DodoWebhookEvent;
	try {
		event = unwrapDodoWebhookEvent(args);
	} catch (error) {
		throw new ORPCError("UNAUTHORIZED" /* error-audit-allow */, {
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
	const metadataOrgId = extractOrgIdFromMetadata(payloadData.metadata);
	const mappedPlan = resolvePlanIdFromProductId(payloadData.product_id);

	if (!mappedPlan && !webhookAllowsMissingProductId(eventType)) {
		logger.error(
			{
				eventType,
				productId: payloadData.product_id,
				webhookId: args.webhookId,
			},
			"unknown dodo product id",
		);
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Unknown Dodo product id",
		});
	}

	if (await isBillingWebhookProcessed(args.webhookId)) {
		return { ok: true, deduped: true };
	}

	const existing = await db
		.select({ status: billingWebhookEvents.status })
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

	const orgId = await resolveOrgIdForWebhookAck({
		metadataOrgId,
		dodoSubscriptionId,
	});
	if (orgId) {
		await invalidateOrgEntitlements(orgId);
	}

	await enqueueBillingWebhook(args.webhookId);
	return { ok: true };
}

export {
	resolveCheckoutFirstBillingInterval,
	resolveCheckoutFirstSeatCount,
} from "./checkout";
