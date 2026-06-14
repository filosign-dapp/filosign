import type { PlanId } from "@filosign/entitlements";
import type { PaidCheckoutPlanId } from "@filosign/shared";
import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import {
	createEntitlementCacheInvalidation,
	flushEntitlementCacheInvalidation,
	invalidateOrgEntitlements,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import {
	type BillingWebhookEventStatus,
	billingWebhookEvents,
} from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { sendPaidSetupEmail } from "@/lib/platform/email";
import { isBillingWebhookProcessed } from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import { tryProcessArchivalDodoWebhook } from "./archival";
import {
	dispatchWebhookSubscriptionSync,
	type WebhookPayloadContext,
} from "./dispatch";

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

function extractEventType(event: DodoWebhookEvent) {
	return event.type ?? event.event_type ?? "";
}

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

function extractOrgIdFromMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	const orgId = metadata?.filosign_org_id;
	return typeof orgId === "string" && orgId.length > 0 ? orgId : null;
}

function extractSetupTokenFromMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	const token = metadata?.filosign_setup_token;
	return typeof token === "string" && token.length >= 8 ? token : null;
}

function extractCheckoutIntentIdFromMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	const id = metadata?.filosign_checkout_intent_id;
	return typeof id === "string" && id.length > 0 ? id : null;
}

function extractPendingIdFromMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	const id = metadata?.filosign_pending_id;
	return typeof id === "string" && id.length > 0 ? id : null;
}

function extractCheckoutKindFromMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	const kind = metadata?.filosign_checkout_kind;
	return typeof kind === "string" && kind.length > 0 ? kind : null;
}

function extractPlanIdFromMetadata(
	metadata: Record<string, unknown> | undefined,
): PlanId | null {
	const planId = metadata?.filosign_plan_id;
	if (
		planId === "individual" ||
		planId === "teams" ||
		planId === "teams_pro" ||
		planId === "enterprise" ||
		planId === "free"
	) {
		return planId;
	}
	return null;
}

async function resolveOrgIdForWebhookAck(args: {
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

/** BullMQ worker: full subscription sync + second entitlement invalidation. */
export async function processDodoWebhookJob(webhookId: string): Promise<void> {
	if (await isBillingWebhookProcessed(webhookId)) {
		return;
	}

	const [stored] = await db
		.select({
			status: billingWebhookEvents.status,
			eventType: billingWebhookEvents.eventType,
			deliveryTimestamp: billingWebhookEvents.deliveryTimestamp,
			payloadJson: billingWebhookEvents.payloadJson,
		})
		.from(billingWebhookEvents)
		.where(eq(billingWebhookEvents.providerEventId, webhookId))
		.limit(1);

	if (!stored) {
		throw new Error(`billing webhook row missing for ${webhookId}`);
	}
	if (stored.status === "processed") {
		return;
	}

	const event = stored.payloadJson as DodoWebhookEvent;
	const eventType = stored.eventType || extractEventType(event);
	const deliveryTimestamp = stored.deliveryTimestamp;
	const payloadData = event.data ?? {};
	const dodoSubscriptionId = payloadData.subscription_id ?? null;
	const dodoCustomerId =
		payloadData.customer?.customer_id ?? payloadData.customer_id ?? null;
	const metadataWallet = extractWalletFromMetadata(payloadData.metadata);
	const metadataOrgId = extractOrgIdFromMetadata(payloadData.metadata);
	const metadataSetupToken = extractSetupTokenFromMetadata(
		payloadData.metadata,
	);
	const metadataCheckoutIntentId = extractCheckoutIntentIdFromMetadata(
		payloadData.metadata,
	);
	const metadataPendingId = extractPendingIdFromMetadata(payloadData.metadata);
	const metadataCheckoutKind = extractCheckoutKindFromMetadata(
		payloadData.metadata,
	);
	const metadataPlanId = extractPlanIdFromMetadata(payloadData.metadata);
	const customerEmail = payloadData.customer?.email ?? null;
	const cancelAtNextBillingDate = Boolean(
		payloadData.cancel_at_next_billing_date,
	);

	const webhookCtx: WebhookPayloadContext = {
		eventType,
		payloadData,
		metadataOrgId,
		metadataWallet,
		metadataSetupToken,
		metadataCheckoutIntentId,
		metadataPendingId,
		metadataCheckoutKind,
		metadataPlanId,
		customerEmail,
		cancelAtNextBillingDate,
	};

	const ackOrgId = await resolveOrgIdForWebhookAck({
		metadataOrgId,
		dodoSubscriptionId,
	});
	if (ackOrgId && deliveryTimestamp) {
		const [subRow] = await db
			.select({ updatedAt: organizationSubscriptions.updatedAt })
			.from(organizationSubscriptions)
			.where(eq(organizationSubscriptions.organizationId, ackOrgId))
			.limit(1);
		if (subRow?.updatedAt && deliveryTimestamp < subRow.updatedAt) {
			await markEventStatus(webhookId, "processed");
			logger.info(
				{ webhookId, ackOrgId },
				"skipped stale dodo webhook (subscription newer)",
			);
			return;
		}
	}

	try {
		const archivalHandled = await tryProcessArchivalDodoWebhook({
			eventType,
			productId: payloadData.product_id,
			metadata: payloadData.metadata,
			dodoSubscriptionId,
			dodoCustomerId,
		});
		if (archivalHandled) {
			await markEventStatus(webhookId, "processed");
			logger.info({ webhookId, eventType }, "processed archival dodo webhook");
			return;
		}

		const checkoutFirstEmail: {
			payload: {
				to: string;
				setupUrl: string;
				planLabel: string;
				planId: PaidCheckoutPlanId;
			} | null;
		} = { payload: null };
		const entitlementInvalidation = createEntitlementCacheInvalidation();

		const dispatchResult = await db.transaction(async (tx) =>
			dispatchWebhookSubscriptionSync({
				tx,
				ctx: webhookCtx,
				entitlementInvalidation,
			}),
		);
		checkoutFirstEmail.payload = dispatchResult.checkoutFirstEmail ?? null;

		await flushEntitlementCacheInvalidation(entitlementInvalidation);

		if (ackOrgId) {
			await invalidateOrgEntitlements(ackOrgId);
		}

		if (checkoutFirstEmail.payload) {
			await sendPaidSetupEmail({
				to: checkoutFirstEmail.payload.to,
				setupUrl: checkoutFirstEmail.payload.setupUrl,
				planLabel: checkoutFirstEmail.payload.planLabel,
				planId: checkoutFirstEmail.payload.planId,
			});
		}

		await markEventStatus(webhookId, "processed");
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Unknown webhook processing error";
		await markEventStatus(webhookId, "failed", message);
		logger.error(
			{ webhookId, eventType, error: message },
			"failed to process dodo webhook",
		);
		throw error;
	}
}
