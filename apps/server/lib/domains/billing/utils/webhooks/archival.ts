import {
	extendOrgArchivalRetention,
	lapseOrgArchival,
} from "@/lib/domains/archival";
import {
	isArchivalProductId,
	isArchivalSubscriptionProduct,
	resolveArchivalProductIdFromDodoProduct,
} from "@/lib/domains/billing/utils/archival-products";

function extractArchivalProductFromMetadata(
	metadata: Record<string, unknown> | undefined,
) {
	const raw = metadata?.filosign_archival_product_id;
	if (typeof raw !== "string" || !isArchivalProductId(raw)) return null;
	return raw;
}

function extractOrgIdFromMetadata(
	metadata: Record<string, unknown> | undefined,
): string | null {
	const orgId = metadata?.filosign_org_id;
	return typeof orgId === "string" && orgId.length > 0 ? orgId : null;
}

const RENEW_EVENTS = new Set([
	"subscription.active",
	"subscription.renewed",
	"payment.succeeded",
]);

const LAPSE_EVENTS = new Set([
	"subscription.cancelled",
	"subscription.canceled",
	"subscription.expired",
	"payment.failed",
]);

/**
 * Returns true when the webhook was handled as an archival product (caller should skip workspace sync).
 */
export async function tryProcessArchivalDodoWebhook(args: {
	eventType: string;
	productId: string | undefined;
	metadata: Record<string, unknown> | undefined;
	dodoSubscriptionId: string | null;
	dodoCustomerId: string | null;
}): Promise<boolean> {
	const archivalFromProduct = resolveArchivalProductIdFromDodoProduct(
		args.productId,
	);
	const archivalFromMeta = extractArchivalProductFromMetadata(args.metadata);
	const archivalProductId = archivalFromProduct ?? archivalFromMeta;
	if (!archivalProductId) {
		return false;
	}

	const organizationId = extractOrgIdFromMetadata(args.metadata);
	if (!organizationId) {
		throw new Error("Archival webhook missing filosign_org_id metadata");
	}

	if (RENEW_EVENTS.has(args.eventType)) {
		await extendOrgArchivalRetention({
			organizationId,
			productId: archivalProductId,
			dodoSubscriptionId: isArchivalSubscriptionProduct(archivalProductId)
				? args.dodoSubscriptionId
				: null,
			dodoCustomerId: args.dodoCustomerId,
		});
		return true;
	}

	if (LAPSE_EVENTS.has(args.eventType)) {
		if (isArchivalSubscriptionProduct(archivalProductId)) {
			await lapseOrgArchival({ organizationId });
		}
		return true;
	}

	return false;
}
