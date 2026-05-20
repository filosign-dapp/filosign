import { ORPCError } from "@orpc/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress, isAddress } from "viem";
import env from "@/env";
import {
	buildEntitlementsSnapshot,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import { fileColdInvites, files } from "@/lib/platform/db/schema/file";

function parseAdminWallets(): Set<string> {
	const raw = env.ADMIN_WALLETS?.trim();
	if (!raw) return new Set();
	return new Set(
		raw
			.split(",")
			.map((w) => w.trim().toLowerCase())
			.filter(Boolean),
	);
}

export function assertMetricsAdmin(wallet: Address): void {
	const admins = parseAdminWallets();
	if (admins.size === 0) {
		throw new ORPCError("FORBIDDEN", {
			message: "Metrics API is not configured",
		});
	}
	if (!admins.has(getAddress(wallet).toLowerCase())) {
		throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
	}
}

export async function metricsInvitesSummary(args: {
	adminWallet: Address;
	senderWallet?: string | undefined;
	from?: Date | undefined;
	to?: Date | undefined;
}) {
	assertMetricsAdmin(args.adminWallet);

	const conditions = [];
	if (args.senderWallet) {
		if (!isAddress(args.senderWallet)) {
			throw new ORPCError("BAD_REQUEST", { message: "Invalid sender wallet" });
		}
		conditions.push(eq(files.sender, getAddress(args.senderWallet)));
	}
	if (args.from) {
		conditions.push(gte(fileColdInvites.createdAt, args.from));
	}
	if (args.to) {
		conditions.push(lte(fileColdInvites.createdAt, args.to));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const rows = await db
		.select({
			status: fileColdInvites.status,
			count: sql<number>`count(*)::int`,
		})
		.from(fileColdInvites)
		.innerJoin(files, eq(fileColdInvites.filePieceCid, files.pieceCid))
		.where(whereClause)
		.groupBy(fileColdInvites.status);

	const summary = {
		sent: 0,
		claimed: 0,
		expired: 0,
		pending: 0,
		revoked: 0,
	};

	for (const row of rows) {
		const n = row.count ?? 0;
		summary.sent += n;
		if (row.status === "claimed") summary.claimed += n;
		else if (row.status === "expired") summary.expired += n;
		else if (row.status === "pending") summary.pending += n;
		else if (row.status === "revoked") summary.revoked += n;
	}

	return summary;
}

export async function metricsSenderUsage(args: {
	adminWallet: Address;
	wallet: string;
}) {
	assertMetricsAdmin(args.adminWallet);
	if (!isAddress(args.wallet)) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid wallet" });
	}
	const wallet = getAddress(args.wallet);
	const ctx = await resolveEntitlementContext(wallet);
	const entitlements = buildEntitlementsSnapshot(ctx);

	return {
		wallet,
		planId: entitlements.planId,
		documentsSentThisMonth:
			entitlements.limits["documents.sent.monthly"].used ?? 0,
		limits: entitlements.limits,
		features: entitlements.features,
	};
}
