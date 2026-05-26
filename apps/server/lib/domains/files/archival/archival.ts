import type { FeatureKey } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import type { ArchivalTier } from "@/lib/platform/db/schema/file";
import {
	copyPieceFromR2ToFoc,
	markArchivalFailed,
} from "./utils/archive-to-foc";

const { files, fileArchival, fileParticipants } = db.schema;

const TIER_YEARS: Record<ArchivalTier, number> = {
	"1y": 1,
	"5y": 5,
	"10y": 10,
};

const TIER_FEATURE: Record<ArchivalTier, FeatureKey> = {
	"1y": "archival.1y",
	"5y": "archival.5y",
	"10y": "archival.10y",
};

function expiresAtForTier(tier: ArchivalTier, from: Date): Date {
	const d = new Date(from);
	d.setUTCFullYear(d.getUTCFullYear() + TIER_YEARS[tier]);
	return d;
}

async function assertCanAccessFile(wallet: Address, pieceCid: string) {
	const userWallet = getAddress(wallet);
	const [fileRecord] = await db
		.select({ sender: files.sender, organizationId: files.organizationId })
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	if (getAddress(fileRecord.sender) === userWallet) {
		return fileRecord;
	}

	const [participant] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!participant) {
		throw new ORPCError("FORBIDDEN", {
			message: "Not allowed to archive this file",
		});
	}

	return fileRecord;
}

export async function purchaseFileArchival(
	wallet: Address,
	pieceCid: string,
	tier: ArchivalTier,
) {
	const fileRecord = await assertCanAccessFile(wallet, pieceCid);

	const featureKey = TIER_FEATURE[tier];
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		fileRecord.organizationId,
	);
	assertEntitlement(entitlementCtx, featureKey);

	const [existing] = await db
		.select()
		.from(fileArchival)
		.where(eq(fileArchival.pieceCid, pieceCid));

	if (existing?.status === "archived") {
		throw new ORPCError("CONFLICT", {
			message: "File is already archived on Filecoin",
		});
	}

	const purchasedAt = new Date();
	const expiresAt = expiresAtForTier(tier, purchasedAt);

	await db
		.insert(fileArchival)
		.values({
			pieceCid,
			purchasedByWallet: getAddress(wallet),
			tier,
			status: "pending",
			purchasedAt,
			expiresAt,
		})
		.onConflictDoUpdate({
			target: fileArchival.pieceCid,
			set: {
				purchasedByWallet: getAddress(wallet),
				tier,
				status: "pending",
				purchasedAt,
				expiresAt,
				archivedAt: null,
				failureReason: null,
				updatedAt: new Date(),
			},
		});

	void copyPieceFromR2ToFoc(pieceCid).catch(async (err) => {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[archival] FOC copy failed", { pieceCid, error: message });
		await markArchivalFailed(pieceCid, message);
	});

	return { pieceCid, tier, status: "pending" as const, expiresAt };
}

export async function getFileArchivalStatus(wallet: Address, pieceCid: string) {
	await assertCanAccessFile(wallet, pieceCid);

	const [row] = await db
		.select()
		.from(fileArchival)
		.where(eq(fileArchival.pieceCid, pieceCid));

	if (!row) {
		return { pieceCid, archival: null };
	}

	return {
		pieceCid,
		archival: {
			tier: row.tier as ArchivalTier,
			status: row.status,
			purchasedAt: row.purchasedAt,
			expiresAt: row.expiresAt,
			archivedAt: row.archivedAt,
			failureReason: row.failureReason,
		},
	};
}
