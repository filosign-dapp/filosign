import type { ComplianceBundle } from "@filosign/shared";
import type { Address } from "viem";
import { getAddress } from "viem";
import type db from "@/lib/platform/db";
import { complianceExportLogs } from "@/lib/platform/db/schema/file";

export async function insertComplianceExportLog(args: {
	db: typeof db;
	pieceCid: string;
	requestedBy: Address;
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
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
		documentSha256,
		requestUserAgent,
		requestIp,
	} = args;

	const signaturesSnapshotCount = bundle.signers.filter((s) => s.signed).length;

	const [row] = await database
		.insert(complianceExportLogs)
		.values({
			filePieceCid: pieceCid,
			requestedBy: getAddress(requestedBy),
			bundleVersion: bundle.version,
			bundleHash,
			bundleJson: bundle,
			executionStatus: bundle.executionStatus,
			signaturesSnapshotCount,
			documentSha256: documentSha256 ?? null,
			requestUserAgent: requestUserAgent ?? null,
			requestIp: requestIp ?? null,
		})
		.returning({ id: complianceExportLogs.id });

	const exportId = row?.id;
	if (!exportId) {
		throw new Error("Failed to persist compliance export log");
	}
	return { exportId };
}
