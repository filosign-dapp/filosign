import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	buildComplianceBundleAndHash,
	insertComplianceExportLog,
} from "@/lib/platform/compliance";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { files, fileParticipants, users } = db.schema;

export async function pieceComplianceBundle(args: {
	userWallet: Address;
	pieceCid: string;
	documentSha256?: string | undefined;
	userAgent: string | null;
	requestIp: string | null;
}) {
	const pieceCid = args.pieceCid;
	const documentSha256 = args.documentSha256?.trim() || undefined;

	const participants = await db
		.select({
			wallet: fileParticipants.wallet,
			role: fileParticipants.role,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			username: users.username,
			authProviderId: users.authProviderId,
		})
		.from(fileParticipants)
		.leftJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(eq(fileParticipants.filePieceCid, pieceCid));

	const [fileRecord] = await db
		.select({ pieceCid: files.pieceCid, sender: files.sender })
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const userWalletNorm = getAddress(args.userWallet);
	const participantUser = participants.find(
		(p) => getAddress(p.wallet) === userWalletNorm,
	);
	if (!participantUser) {
		throw new ORPCError("FORBIDDEN", {
			message: "You dont have access to this file",
		});
	}

	const participantRows = participants.map((p) => ({
		wallet: getAddress(p.wallet),
		role: p.role as "sender" | "viewer" | "signer",
		firstName: p.firstName,
		lastName: p.lastName,
		email: p.email,
		username: p.username,
		authProviderId: p.authProviderId ?? null,
	}));

	const bundleRes = await tryCatch(
		buildComplianceBundleAndHash({
			db,
			pieceCid,
			participantRows,
		}),
	);
	if (bundleRes.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message:
				bundleRes.error instanceof Error
					? bundleRes.error.message
					: "Compliance bundle failed",
		});
	}
	const bundleResult = bundleRes.data;

	const logRes = await tryCatch(
		insertComplianceExportLog({
			db,
			pieceCid,
			requestedBy: userWalletNorm,
			bundle: bundleResult.bundle,
			bundleHash: bundleResult.bundleHash,
			documentSha256,
			requestUserAgent: args.userAgent,
			requestIp: args.requestIp,
		}),
	);
	if (logRes.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to log compliance export",
		});
	}
	const logResult = logRes.data;

	return {
		exportId: logResult.exportId,
		bundleHash: bundleResult.bundleHash,
		bundle: bundleResult.bundle,
	};
}
