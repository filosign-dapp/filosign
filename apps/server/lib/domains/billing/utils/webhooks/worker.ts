import type { PlanId } from "@filosign/entitlements";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
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
	userSubscriptions,
} from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { sendPaidSetupEmail } from "@/lib/platform/email";
import { isBillingWebhookProcessed } from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import {
	isWorkspaceBillingPlanId,
	resolveIntervalFromProductId,
	resolvePlanIdFromProductId,
} from "../policy";
import {
	isCheckoutFirstWithoutOrg,
	prepareCheckoutFirstPaidAccessInTx,
} from "./checkout";
import {
	mapDodoSubscriptionStatus,
	resolveSubscriptionQuantity,
	resolveWebhookOrgSync,
	resolveWebhookUserPlanId,
	syncOrgSubscription,
	syncUserSubscription,
	webhookAllowsMissingProductId,
} from "./sync";

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
	const metadataPlanId = extractPlanIdFromMetadata(payloadData.metadata);
	const customerEmail = payloadData.customer?.email ?? null;
	const mappedPlan = resolvePlanIdFromProductId(payloadData.product_id);
	const billingInterval = resolveIntervalFromProductId(payloadData.product_id);
	const cancelAtNextBillingDate = Boolean(
		payloadData.cancel_at_next_billing_date,
	);

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

		if (ackOrgId) {
			await invalidateOrgEntitlements(ackOrgId);
		}

		if (checkoutFirstEmail.payload) {
			await sendPaidSetupEmail({
				to: checkoutFirstEmail.payload.to,
				setupUrl: checkoutFirstEmail.payload.setupUrl,
				planLabel: checkoutFirstEmail.payload.planLabel,
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
