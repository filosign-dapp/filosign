import type { PlanId } from "@filosign/entitlements";
import type { PaidCheckoutPlanId } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import type { createEntitlementCacheInvalidation } from "@/lib/platform/cache";
import type db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { platformAccessPending } from "@/lib/platform/db/schema/platform-access";
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

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type WebhookPayloadContext = {
	eventType: string;
	payloadData: {
		subscription_id?: string;
		status?: string;
		product_id?: string;
		quantity?: number;
		customer_id?: string;
		customer?: { customer_id?: string; email?: string };
		metadata?: Record<string, unknown>;
		cancel_at_next_billing_date?: boolean;
	};
	metadataOrgId: string | null;
	metadataWallet: `0x${string}` | null;
	metadataSetupToken: string | null;
	metadataCheckoutIntentId: string | null;
	metadataPlanId: PlanId | null;
	customerEmail: string | null;
	cancelAtNextBillingDate: boolean;
};

export type WebhookHandlerResult =
	| {
			handled: true;
			stop: true;
			checkoutFirstEmail?: {
				to: string;
				setupUrl: string;
				planLabel: string;
				planId: PaidCheckoutPlanId;
			} | null;
	  }
	| {
			handled: true;
			stop: false;
			checkoutFirstEmail?: {
				to: string;
				setupUrl: string;
				planLabel: string;
				planId: PaidCheckoutPlanId;
			} | null;
	  }
	| { handled: false };

type WebhookHandler = (args: {
	tx: DbTx;
	ctx: WebhookPayloadContext;
	entitlementInvalidation: ReturnType<
		typeof createEntitlementCacheInvalidation
	>;
}) => Promise<WebhookHandlerResult>;

async function trySyncOrgSubscription(args: {
	tx: DbTx;
	ctx: WebhookPayloadContext;
	entitlementInvalidation: ReturnType<
		typeof createEntitlementCacheInvalidation
	>;
	organizationId: string;
	existingOrgSub?: { planId: string; seatCount: number };
}): Promise<WebhookHandlerResult> {
	const { tx, ctx, entitlementInvalidation, organizationId, existingOrgSub } =
		args;
	const mappedPlan = resolvePlanIdFromProductId(ctx.payloadData.product_id);
	const billingInterval = resolveIntervalFromProductId(
		ctx.payloadData.product_id,
	);
	const dodoSubscriptionId = ctx.payloadData.subscription_id ?? null;
	const dodoCustomerId =
		ctx.payloadData.customer?.customer_id ??
		ctx.payloadData.customer_id ??
		null;

	const orgSyncPreview = resolveWebhookOrgSync({
		eventType: ctx.eventType,
		mappedPlan,
		cancelAtNextBillingDate: ctx.cancelAtNextBillingDate,
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
		payloadQuantity: ctx.payloadData.quantity,
		required: orgSyncPreview.requireQuantity,
	});

	const orgSync = resolveWebhookOrgSync({
		eventType: ctx.eventType,
		mappedPlan,
		cancelAtNextBillingDate: ctx.cancelAtNextBillingDate,
		quantity,
		existingPlanId: existingOrgSub?.planId as
			| "teams"
			| "teams_pro"
			| "free"
			| undefined,
		existingSeatCount: existingOrgSub?.seatCount,
	});

	const status = mapDodoSubscriptionStatus(
		ctx.payloadData.status,
		ctx.eventType,
		ctx.cancelAtNextBillingDate,
	);

	await syncOrgSubscription(tx, {
		organizationId,
		planId: orgSync.planId as "free" | "individual" | "teams" | "teams_pro",
		seatCount: orgSync.seatCount ?? 1,
		status,
		billingInterval: orgSync.planId === "free" ? null : billingInterval,
		payloadData: ctx.payloadData,
		dodoCustomerId,
		dodoSubscriptionId,
	});
	entitlementInvalidation.orgIds.add(organizationId);
	return { handled: true, stop: true };
}

async function resolveOrgContext(
	tx: DbTx,
	ctx: WebhookPayloadContext,
): Promise<{
	organizationId: string | null;
	existingOrgSub?: { planId: string; seatCount: number };
}> {
	let organizationId = ctx.metadataOrgId;
	let existingOrgSub: { planId: string; seatCount: number } | undefined;

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

	const dodoSubscriptionId = ctx.payloadData.subscription_id ?? null;
	if (!organizationId && dodoSubscriptionId) {
		const [subByDodo] = await tx
			.select({
				organizationId: organizationSubscriptions.organizationId,
				planId: organizationSubscriptions.planId,
				seatCount: organizationSubscriptions.seatCount,
			})
			.from(organizationSubscriptions)
			.where(
				eq(organizationSubscriptions.dodoSubscriptionId, dodoSubscriptionId),
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

	return { organizationId, existingOrgSub };
}

const WEBHOOK_HANDLERS: WebhookHandler[] = [
	async ({ tx, ctx, entitlementInvalidation }) => {
		const { organizationId, existingOrgSub } = await resolveOrgContext(tx, ctx);
		const mappedPlan = resolvePlanIdFromProductId(ctx.payloadData.product_id);

		const orgCandidate =
			organizationId &&
			(mappedPlan == null ||
				isWorkspaceBillingPlanId(mappedPlan) ||
				existingOrgSub?.planId === "individual" ||
				existingOrgSub?.planId === "teams" ||
				existingOrgSub?.planId === "teams_pro" ||
				webhookAllowsMissingProductId(ctx.eventType));

		if (!orgCandidate || !organizationId) {
			return { handled: false };
		}

		return trySyncOrgSubscription({
			tx,
			ctx,
			entitlementInvalidation,
			organizationId,
			existingOrgSub,
		});
	},
	async ({ tx, ctx }) => {
		const { organizationId } = await resolveOrgContext(tx, ctx);
		const checkoutFirstWithoutOrg = await isCheckoutFirstWithoutOrg(tx, {
			metadataSetupToken: ctx.metadataSetupToken,
			dodoSubscriptionId: ctx.payloadData.subscription_id ?? null,
			organizationId,
		});

		if (!checkoutFirstWithoutOrg) {
			return { handled: false };
		}

		if (ctx.eventType !== "subscription.active") {
			if (
				ctx.eventType === "subscription.cancelled" ||
				ctx.eventType === "subscription.expired"
			) {
				const dodoSubscriptionId = ctx.payloadData.subscription_id ?? null;
				if (dodoSubscriptionId) {
					await tx
						.update(platformAccessPending)
						.set({
							status: "expired",
							updatedAt: new Date(),
						})
						.where(
							eq(platformAccessPending.dodoSubscriptionId, dodoSubscriptionId),
						);
				}
			}
			return { handled: true, stop: true };
		}

		const checkoutFirstEmail = await prepareCheckoutFirstPaidAccessInTx(tx, {
			eventType: ctx.eventType,
			setupToken: ctx.metadataSetupToken,
			checkoutIntentId: ctx.metadataCheckoutIntentId,
			dodoSubscriptionId: ctx.payloadData.subscription_id ?? null,
			dodoCustomerId:
				ctx.payloadData.customer?.customer_id ??
				ctx.payloadData.customer_id ??
				null,
			metadataPlanId: ctx.metadataPlanId,
			mappedPlan: resolvePlanIdFromProductId(ctx.payloadData.product_id),
			customerEmail: ctx.customerEmail,
			metadata: ctx.payloadData.metadata,
			productId: ctx.payloadData.product_id,
			payloadQuantity: ctx.payloadData.quantity,
		});

		return { handled: true, stop: true, checkoutFirstEmail };
	},
	async ({ tx, ctx, entitlementInvalidation }) => {
		const mappedPlan = resolvePlanIdFromProductId(ctx.payloadData.product_id);
		const { organizationId } = await resolveOrgContext(tx, ctx);

		if (mappedPlan && isWorkspaceBillingPlanId(mappedPlan) && !organizationId) {
			throw new Error(
				"Unable to route workspace plan webhook without organization",
			);
		}

		const dodoCustomerId =
			ctx.payloadData.customer?.customer_id ??
			ctx.payloadData.customer_id ??
			null;

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
			eventType: ctx.eventType,
			mappedPlan,
			cancelAtNextBillingDate: ctx.cancelAtNextBillingDate,
			existingPlanId: existingUserPlan,
		});

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
		if (!walletAddress && ctx.metadataWallet) {
			walletAddress = ctx.metadataWallet;
		}

		if (!walletAddress) {
			throw new Error("Unable to resolve wallet for webhook");
		}

		const status = mapDodoSubscriptionStatus(
			ctx.payloadData.status,
			ctx.eventType,
			ctx.cancelAtNextBillingDate,
		);

		await syncUserSubscription(tx, {
			walletAddress,
			planId: userPlanId,
			status,
			payloadData: ctx.payloadData,
			dodoCustomerId,
			dodoSubscriptionId: ctx.payloadData.subscription_id ?? null,
		});
		entitlementInvalidation.wallets.add(walletAddress as Address);
		return { handled: true, stop: true };
	},
];

export async function dispatchWebhookSubscriptionSync(args: {
	tx: DbTx;
	ctx: WebhookPayloadContext;
	entitlementInvalidation: ReturnType<
		typeof createEntitlementCacheInvalidation
	>;
}): Promise<{
	checkoutFirstEmail?: {
		to: string;
		setupUrl: string;
		planLabel: string;
		planId: PaidCheckoutPlanId;
	} | null;
}> {
	for (const handler of WEBHOOK_HANDLERS) {
		const result = await handler(args);
		if (!result.handled) continue;
		if (result.stop) {
			return { checkoutFirstEmail: result.checkoutFirstEmail ?? null };
		}
		return { checkoutFirstEmail: result.checkoutFirstEmail ?? null };
	}
	return {};
}
