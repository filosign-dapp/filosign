import type { PlanId } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { checkoutPlanLabel } from "@/lib/domains/billing/checkout-intents";
import {
	type PlatformAccessTx,
	upsertPaidAccessPendingFromWebhook,
} from "@/lib/domains/platform-access";
import {
	createEntitlementCacheInvalidation,
	flushEntitlementCacheInvalidation,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import {
	type BillingWebhookEventStatus,
	billingWebhookEvents,
	type SubscriptionStatus,
	userSubscriptions,
} from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import {
	checkoutIntents,
	platformAccessPending,
} from "@/lib/platform/db/schema/platform-access";
import { sendPaidSetupEmail } from "@/lib/platform/email/invites";
import { getClientUrl } from "@/lib/platform/email/public-url";
import { logger } from "@/lib/platform/pino";
import { createDodoClient } from "./dodo-client";
import {
	isWorkspaceBillingPlanId,
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
			email?: string;
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

function extractSeatCountFromMetadata(
	metadata: Record<string, unknown> | undefined,
): number | null {
	const raw = metadata?.filosign_seat_count;
	if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1) {
		return raw;
	}
	if (typeof raw === "string") {
		const parsed = Number.parseInt(raw, 10);
		if (Number.isInteger(parsed) && parsed >= 1) return parsed;
	}
	return null;
}

function extractIntervalFromMetadata(
	metadata: Record<string, unknown> | undefined,
): "monthly" | "yearly" | null {
	const interval = metadata?.filosign_interval;
	return interval === "monthly" || interval === "yearly" ? interval : null;
}

export function resolveCheckoutFirstSeatCount(args: {
	metadata?: Record<string, unknown>;
	payloadQuantity?: number;
	intentSeatCount?: number;
}): number {
	const fromMetadata = extractSeatCountFromMetadata(args.metadata);
	if (fromMetadata) return fromMetadata;
	if (
		typeof args.payloadQuantity === "number" &&
		Number.isInteger(args.payloadQuantity) &&
		args.payloadQuantity >= 1
	) {
		return args.payloadQuantity;
	}
	if (
		typeof args.intentSeatCount === "number" &&
		Number.isInteger(args.intentSeatCount) &&
		args.intentSeatCount >= 1
	) {
		return args.intentSeatCount;
	}
	return 1;
}

export function resolveCheckoutFirstBillingInterval(args: {
	metadata?: Record<string, unknown>;
	productId?: string;
	intentInterval?: "monthly" | "yearly" | null;
}): "monthly" | "yearly" | null {
	return (
		extractIntervalFromMetadata(args.metadata) ??
		args.intentInterval ??
		resolveIntervalFromProductId(args.productId)
	);
}

async function isCheckoutFirstWithoutOrg(
	tx: PlatformAccessTx,
	args: {
		metadataSetupToken: string | null;
		dodoSubscriptionId: string | null;
		organizationId: string | null;
	},
): Promise<boolean> {
	if (args.organizationId) return false;
	if (args.metadataSetupToken) return true;
	if (!args.dodoSubscriptionId) return false;

	const [pending] = await tx
		.select({ id: platformAccessPending.id })
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.dodoSubscriptionId, args.dodoSubscriptionId),
				eq(platformAccessPending.status, "pending_wallet"),
			),
		)
		.limit(1);

	return Boolean(pending);
}

async function prepareCheckoutFirstPaidAccessInTx(
	tx: PlatformAccessTx,
	args: {
		eventType: string;
		setupToken: string | null;
		checkoutIntentId: string | null;
		dodoSubscriptionId: string | null;
		dodoCustomerId: string | null;
		metadataPlanId: PlanId | null;
		mappedPlan: PlanId | null;
		customerEmail: string | null;
		metadata?: Record<string, unknown>;
		productId?: string;
		payloadQuantity?: number;
	},
): Promise<{ to: string; setupUrl: string; planLabel: string } | null> {
	if (args.eventType !== "subscription.active") return null;

	const planId = args.metadataPlanId ?? args.mappedPlan;
	if (!planId || planId === "free" || planId === "enterprise") {
		logger.error(
			{ setupToken: args.setupToken, planId },
			"checkout-first webhook missing plan id",
		);
		return null;
	}

	let intentSeatCount: number | undefined;
	let intentInterval: "monthly" | "yearly" | null | undefined;
	let email = args.customerEmail?.trim().toLowerCase() ?? null;
	if (args.checkoutIntentId) {
		const [intent] = await tx
			.select({
				email: checkoutIntents.email,
				seatCount: checkoutIntents.seatCount,
				billingInterval: checkoutIntents.billingInterval,
				setupToken: checkoutIntents.setupToken,
			})
			.from(checkoutIntents)
			.where(eq(checkoutIntents.id, args.checkoutIntentId))
			.limit(1);
		if (intent) {
			email = email ?? intent.email?.trim().toLowerCase() ?? null;
			intentSeatCount = intent.seatCount;
			intentInterval = intent.billingInterval as "monthly" | "yearly";
		}
	}

	if (!email) {
		logger.error(
			{ setupToken: args.setupToken, checkoutIntentId: args.checkoutIntentId },
			"checkout-first webhook missing customer email",
		);
		return null;
	}

	if (!args.dodoSubscriptionId) {
		logger.error(
			{ setupToken: args.setupToken },
			"checkout-first webhook missing subscription id",
		);
		return null;
	}

	let setupToken = args.setupToken?.trim() ?? "";
	if (!setupToken) {
		const [pending] = await tx
			.select({ setupToken: platformAccessPending.setupToken })
			.from(platformAccessPending)
			.where(
				eq(platformAccessPending.dodoSubscriptionId, args.dodoSubscriptionId),
			)
			.limit(1);
		setupToken = pending?.setupToken ?? "";
	}
	if (!setupToken) {
		logger.error(
			{ dodoSubscriptionId: args.dodoSubscriptionId },
			"checkout-first webhook missing setup token",
		);
		return null;
	}

	const seatCount = resolveCheckoutFirstSeatCount({
		metadata: args.metadata,
		payloadQuantity: args.payloadQuantity,
		intentSeatCount,
	});
	const billingInterval = resolveCheckoutFirstBillingInterval({
		metadata: args.metadata,
		productId: args.productId,
		intentInterval,
	});

	const { created } = await upsertPaidAccessPendingFromWebhook(tx, {
		setupToken,
		email,
		planId,
		dodoSubscriptionId: args.dodoSubscriptionId,
		dodoCustomerId: args.dodoCustomerId,
		seatCount,
		billingInterval,
		checkoutIntentId: args.checkoutIntentId,
	});

	const setupUrl = `${getClientUrl()}/?setup=${encodeURIComponent(setupToken)}`;

	logger.info(
		{
			email,
			planId,
			dodoSubscriptionId: args.dodoSubscriptionId,
			created,
		},
		"checkout-first pending access upserted",
	);

	return {
		to: email,
		setupUrl,
		planLabel: checkoutPlanLabel(planId),
	};
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
		planId: "free" | "individual" | "teams" | "teams_pro";
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
	const metadataSetupToken = extractSetupTokenFromMetadata(
		payloadData.metadata,
	);
	const metadataCheckoutIntentId = extractCheckoutIntentIdFromMetadata(
		payloadData.metadata,
	);
	const metadataPlanId = extractPlanIdFromMetadata(payloadData.metadata);
	const customerEmail = payloadData.customer?.email ?? null;
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
		const checkoutFirstEmail: {
			payload: { to: string; setupUrl: string; planLabel: string } | null;
		} = { payload: null };
		const entitlementInvalidation = createEntitlementCacheInvalidation();

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
					isWorkspaceBillingPlanId(mappedPlan) ||
					existingOrgSub?.planId === "individual" ||
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
					planId: orgSync.planId as
						| "free"
						| "individual"
						| "teams"
						| "teams_pro",
					seatCount: orgSync.seatCount ?? 1,
					status,
					billingInterval: orgSync.planId === "free" ? null : billingInterval,
					payloadData,
					dodoCustomerId,
					dodoSubscriptionId,
				});
				entitlementInvalidation.orgIds.add(organizationId);
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

			const checkoutFirstWithoutOrg = await isCheckoutFirstWithoutOrg(tx, {
				metadataSetupToken,
				dodoSubscriptionId,
				organizationId,
			});

			if (checkoutFirstWithoutOrg) {
				if (eventType === "subscription.active") {
					checkoutFirstEmail.payload = await prepareCheckoutFirstPaidAccessInTx(
						tx,
						{
							eventType,
							setupToken: metadataSetupToken,
							checkoutIntentId: metadataCheckoutIntentId,
							dodoSubscriptionId,
							dodoCustomerId,
							metadataPlanId,
							mappedPlan,
							customerEmail,
							metadata: payloadData.metadata,
							productId: payloadData.product_id,
							payloadQuantity: payloadData.quantity,
						},
					);
				}
				return;
			}

			if (
				mappedPlan &&
				isWorkspaceBillingPlanId(mappedPlan) &&
				!organizationId
			) {
				throw new Error(
					"Unable to route workspace plan webhook without organization",
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
			entitlementInvalidation.wallets.add(walletAddress as Address);
		});

		await flushEntitlementCacheInvalidation(entitlementInvalidation);

		if (checkoutFirstEmail.payload) {
			await sendPaidSetupEmail({
				to: checkoutFirstEmail.payload.to,
				setupUrl: checkoutFirstEmail.payload.setupUrl,
				planLabel: checkoutFirstEmail.payload.planLabel,
			});
		}

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
