import {
	type ComplianceBundle,
	type ComplianceExportKind,
	canonicalComplianceBundleJson,
} from "@filosign/shared";
import type { Address } from "viem";
import { getAddress } from "viem";
import { sha256HexUtf8 } from "@/lib/platform/compliance/hash";
import type db from "@/lib/platform/db";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { complianceExportLogs } from "@/lib/platform/db/schema/file";
import { bucket } from "@/lib/platform/s3/client";

export function complianceExportStorageKey(exportId: string): string {
	return `compliance-exports/${exportId}.json`;
}

export async function insertComplianceExportLog(args: {
	db: typeof db;
	pieceCid: string;
	requestedBy: Address;
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	exportKind: ComplianceExportKind;
	documentSha256?: string | undefined;
	requestUserAgent?: string | null;
	requestIp?: string | null;
}): Promise<{ exportId: string }> {
	const {
		db: database,
		pieceCid,
		requestedBy,
		bundle,
		bundleHash,
		exportKind,
		documentSha256,
		requestUserAgent,
		requestIp,
	} = args;

	const signaturesSnapshotCount = bundle.signers.filter((s) => s.signed).length;
	const exportId = randomUuidV7();
	const canonical = canonicalComplianceBundleJson(bundle);
	const computedHash = sha256HexUtf8(canonical);
	if (computedHash !== bundleHash) {
		throw new Error("compliance bundle hash mismatch");
	}

	const storageKey = complianceExportStorageKey(exportId);
	await bucket.write(storageKey, new TextEncoder().encode(canonical), {
		type: "application/json",
	});

	const [row] = await database
		.insert(complianceExportLogs)
		.values({
			id: exportId,
			filePieceCid: pieceCid,
			requestedBy: getAddress(requestedBy),
			bundleVersion: bundle.version,
			bundleHash,
			storageKey,
			executionStatus: bundle.executionStatus,
			signaturesSnapshotCount,
			exportKind,
			documentSha256: documentSha256 ?? null,
			requestUserAgent: requestUserAgent ?? null,
			requestIp: requestIp ?? null,
		})
		.returning({ id: complianceExportLogs.id });

	if (!row?.id) {
		throw new Error("Failed to persist compliance export log");
	}
	return { exportId: row.id };
}
