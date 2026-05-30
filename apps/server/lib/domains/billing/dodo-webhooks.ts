import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import {
	type BillingWebhookEventStatus,
	billingWebhookEvents,
	type SubscriptionStatus,
	userSubscriptions,
} from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { logger } from "@/lib/platform/pino";
import { createDodoClient } from "./dodo-client";
import {
	isOrgBillingPlanId,
	resolveIntervalFromProductId,
	resolvePlanIdFromProductId,
} from "./policy";
import {
	assertTimestampWithinTolerance,
	parseOptionalDate,
	parseWebhookTimestamp,
} from "./webhook-security";
import {
	mapDodoSubscriptionStatus,
	resolveWebhookOrgSync,
	resolveWebhookUserPlanId,
	webhookAllowsMissingProductId,
} from "./webhook-sync";

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

async function resolveSubscriptionQuantity(args: {
	subscriptionId: string | null;
	payloadQuantity: number | undefined;
	required: boolean;
}): Promise<number | undefined> {
	if (
		typeof args.payloadQuantity === "number" &&
		Number.isInteger(args.payloadQuantity) &&
		args.payloadQuantity >= 1
	) {
		return args.payloadQuantity;
	}
	if (!args.subscriptionId) {
		if (args.required) {
			throw new Error("Subscription quantity missing and no subscription id");
		}
		return undefined;
	}

	const client = createDodoClient({ includeWebhookKey: false });
	try {
		const sub = (await client.subscriptions.retrieve(args.subscriptionId)) as {
			quantity?: number;
		};
		if (
			typeof sub.quantity === "number" &&
			Number.isInteger(sub.quantity) &&
			sub.quantity >= 1
		) {
			return sub.quantity;
		}
	} catch (error) {
		logger.warn(
			{ subscriptionId: args.subscriptionId, error },
			"failed to fetch dodo subscription quantity",
		);
	}

	if (args.required) {
		throw new Error("Unable to resolve subscription quantity");
	}
	return undefined;
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

async function syncUserSubscription(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	args: {
		walletAddress: `0x${string}`;
		planId: "free" | "individual";
		status: SubscriptionStatus;
		payloadData: NonNullable<DodoWebhookEvent["data"]>;
		dodoCustomerId: string | null;
		dodoSubscriptionId: string | null;
	},
) {
	await tx
		.insert(userSubscriptions)
		.values({
			walletAddress: args.walletAddress,
			provider: "dodo",
			planId: args.planId,
			status: args.status,
			periodStart:
				parseOptionalDate(args.payloadData.previous_billing_date) ?? new Date(),
			periodEnd: parseOptionalDate(args.payloadData.next_billing_date),
			cancelAtPeriodEnd: Boolean(args.payloadData.cancel_at_next_billing_date),
			dodoCustomerId: args.dodoCustomerId ?? undefined,
			dodoSubscriptionId: args.dodoSubscriptionId ?? undefined,
		})
		.onConflictDoUpdate({
			target: userSubscriptions.walletAddress,
			set: {
				provider: "dodo",
				planId: args.planId,
				status: args.status,
				periodStart:
					parseOptionalDate(args.payloadData.previous_billing_date) ??
					undefined,
				periodEnd: parseOptionalDate(args.payloadData.next_billing_date),
				cancelAtPeriodEnd: Boolean(
					args.payloadData.cancel_at_next_billing_date,
				),
				dodoCustomerId: args.dodoCustomerId ?? undefined,
				dodoSubscriptionId: args.dodoSubscriptionId ?? undefined,
				updatedAt: new Date(),
			},
		});
}

async function syncOrgSubscription(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	args: {
		organizationId: string;
		planId: "free" | "teams" | "teams_pro";
		seatCount: number;
		status: SubscriptionStatus;
		billingInterval: "monthly" | "yearly" | null;
		payloadData: NonNullable<DodoWebhookEvent["data"]>;
		dodoCustomerId: string | null;
		dodoSubscriptionId: string | null;
	},
) {
	await tx
		.update(organizationSubscriptions)
		.set({
			provider: "dodo",
			planId: args.planId,
			seatCount: args.seatCount,
			status: args.status,
			billingInterval: args.billingInterval ?? undefined,
			periodStart:
				parseOptionalDate(args.payloadData.previous_billing_date) ?? undefined,
			periodEnd: parseOptionalDate(args.payloadData.next_billing_date),
			cancelAtPeriodEnd: Boolean(args.payloadData.cancel_at_next_billing_date),
			dodoCustomerId: args.dodoCustomerId ?? undefined,
			dodoSubscriptionId: args.dodoSubscriptionId ?? undefined,
			updatedAt: new Date(),
		})
		.where(eq(organizationSubscriptions.organizationId, args.organizationId));
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
	const metadataOrgId = extractOrgIdFromMetadata(payloadData.metadata);
	const mappedPlan = resolvePlanIdFromProductId(payloadData.product_id);
	const billingInterval = resolveIntervalFromProductId(payloadData.product_id);
	const cancelAtNextBillingDate = Boolean(
		payloadData.cancel_at_next_billing_date,
	);

	if (!mappedPlan && !webhookAllowsMissingProductId(eventType)) {
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
			let organizationId = metadataOrgId;
			let existingOrgSub:
				| {
						planId: string;
						seatCount: number;
				  }
				| undefined;

			if (organizationId) {
				const [row] = await tx
					.select({
						planId: organizationSubscriptions.planId,
						seatCount: organizationSubscriptions.seatCount,
					})
					.from(organizationSubscriptions)
					.where(eq(organizationSubscriptions.organizationId, organizationId))
					.limit(1);
				existingOrgSub = row;
			}

			if (!organizationId && dodoSubscriptionId) {
				const [subByDodo] = await tx
					.select({
						organizationId: organizationSubscriptions.organizationId,
						planId: organizationSubscriptions.planId,
						seatCount: organizationSubscriptions.seatCount,
					})
					.from(organizationSubscriptions)
					.where(
						eq(
							organizationSubscriptions.dodoSubscriptionId,
							dodoSubscriptionId,
						),
					)
					.limit(1);
				organizationId = subByDodo?.organizationId ?? null;
				if (subByDodo) {
					existingOrgSub = {
						planId: subByDodo.planId,
						seatCount: subByDodo.seatCount,
					};
				}
			}

			const orgCandidate =
				organizationId &&
				(mappedPlan == null ||
					isOrgBillingPlanId(mappedPlan) ||
					existingOrgSub?.planId === "teams" ||
					existingOrgSub?.planId === "teams_pro" ||
					webhookAllowsMissingProductId(eventType));

			if (orgCandidate && organizationId) {
				const orgSyncPreview = resolveWebhookOrgSync({
					eventType,
					mappedPlan,
					cancelAtNextBillingDate,
					quantity: undefined,
					existingPlanId: existingOrgSub?.planId as
						| "teams"
						| "teams_pro"
						| "free"
						| undefined,
					existingSeatCount: existingOrgSub?.seatCount,
				});

				const quantity = await resolveSubscriptionQuantity({
					subscriptionId: dodoSubscriptionId,
					payloadQuantity: payloadData.quantity,
					required: orgSyncPreview.requireQuantity,
				});

				const orgSync = resolveWebhookOrgSync({
					eventType,
					mappedPlan,
					cancelAtNextBillingDate,
					quantity,
					existingPlanId: existingOrgSub?.planId as
						| "teams"
						| "teams_pro"
						| "free"
						| undefined,
					existingSeatCount: existingOrgSub?.seatCount,
				});

				const status = mapDodoSubscriptionStatus(
					payloadData.status,
					eventType,
					cancelAtNextBillingDate,
				);

				await syncOrgSubscription(tx, {
					organizationId,
					planId: orgSync.planId as "free" | "teams" | "teams_pro",
					seatCount: orgSync.seatCount ?? 1,
					status,
					billingInterval: orgSync.planId === "free" ? null : billingInterval,
					payloadData,
					dodoCustomerId,
					dodoSubscriptionId,
				});
				return;
			}

			let existingUserPlan: "free" | "individual" | undefined;
			if (dodoCustomerId) {
				const [subByCustomer] = await tx
					.select({ planId: userSubscriptions.planId })
					.from(userSubscriptions)
					.where(
						and(
							eq(userSubscriptions.provider, "dodo"),
							eq(userSubscriptions.dodoCustomerId, dodoCustomerId),
						),
					)
					.limit(1);
				if (
					subByCustomer?.planId === "individual" ||
					subByCustomer?.planId === "free"
				) {
					existingUserPlan = subByCustomer.planId;
				}
			}

			const userPlanId = resolveWebhookUserPlanId({
				eventType,
				mappedPlan,
				cancelAtNextBillingDate,
				existingPlanId: existingUserPlan,
			});

			if (mappedPlan && isOrgBillingPlanId(mappedPlan) && !organizationId) {
				throw new Error(
					"Unable to route org plan webhook without organization",
				);
			}

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

			const status = mapDodoSubscriptionStatus(
				payloadData.status,
				eventType,
				cancelAtNextBillingDate,
			);

			await syncUserSubscription(tx, {
				walletAddress,
				planId: userPlanId,
				status,
				payloadData,
				dodoCustomerId,
				dodoSubscriptionId,
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
