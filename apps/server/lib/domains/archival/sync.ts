import { eq } from "drizzle-orm";
import env from "@/env";
import {
	type ArchivalProductId,
	archivalTermYears,
	isArchivalSubscriptionProduct,
} from "@/lib/domains/billing/utils/archival-products";
import db from "@/lib/platform/db";
import { queueFocExtendRetention } from "./jobs/extend";

const { organizationArchival } = db.schema;

function addYears(from: Date, years: number): Date {
	const d = new Date(from);
	d.setUTCFullYear(d.getUTCFullYear() + years);
	return d;
}

export function exportGraceEnd(from: Date = new Date()): Date {
	const days = env.ARCHIVAL_EXPORT_GRACE_DAYS ?? 30;
	const d = new Date(from);
	d.setUTCDate(d.getUTCDate() + days);
	return d;
}

export async function extendOrgArchivalRetention(args: {
	organizationId: string;
	productId: ArchivalProductId;
	dodoSubscriptionId?: string | null;
	dodoCustomerId?: string | null;
	from?: Date;
}) {
	const base = args.from ?? new Date();
	const retentionUntil = addYears(base, archivalTermYears(args.productId));

	await db
		.insert(organizationArchival)
		.values({
			organizationId: args.organizationId,
			productId: args.productId,
			status: "active",
			retentionUntil,
			exportGraceUntil: null,
			dodoSubscriptionId: isArchivalSubscriptionProduct(args.productId)
				? (args.dodoSubscriptionId ?? null)
				: null,
			dodoCustomerId: args.dodoCustomerId ?? null,
			purchasedAt: base,
		})
		.onConflictDoUpdate({
			target: organizationArchival.organizationId,
			set: {
				productId: args.productId,
				status: "active",
				retentionUntil,
				exportGraceUntil: null,
				dodoSubscriptionId: isArchivalSubscriptionProduct(args.productId)
					? (args.dodoSubscriptionId ?? null)
					: undefined,
				dodoCustomerId: args.dodoCustomerId ?? undefined,
				updatedAt: new Date(),
			},
		});

	await queueFocExtendRetention(args.organizationId);
}

export async function lapseOrgArchival(args: {
	organizationId: string;
	from?: Date;
}) {
	const graceUntil = exportGraceEnd(args.from);

	await db
		.update(organizationArchival)
		.set({
			status: "lapsed",
			exportGraceUntil: graceUntil,
			updatedAt: new Date(),
		})
		.where(eq(organizationArchival.organizationId, args.organizationId));
}
