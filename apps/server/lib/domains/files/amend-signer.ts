import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { fsContracts } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { files, fileSignerAmendments } = db.schema;
const { FSFileRegistry } = fsContracts;

export const zAmendSignerBody = z.object({
	pieceCid: z.string().min(1),
	oldCommitment: zHexString(),
	newCommitment: zHexString(),
	timestamp: z.number().int().positive(),
	signature: zHexString(),
});

export async function filesAmendSigner(sender: Address, rawBody: unknown) {
	const parsed = zAmendSignerBody.safeParse(rawBody);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const { pieceCid, oldCommitment, newCommitment, timestamp, signature } =
		parsed.data;

	const [file] = await db
		.select({ sender: files.sender, registryAddress: files.registryAddress })
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (!file) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (getAddress(file.sender) !== getAddress(sender)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the sender can amend signers",
		});
	}

	const txHash = await tryCatch(
		FSFileRegistry.write.amendSigner([
			pieceCid,
			oldCommitment,
			newCommitment,
			BigInt(timestamp),
			signature,
		]),
	);
	if (txHash.error) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				txHash.error instanceof Error
					? txHash.error.message
					: "amendSigner relay failed",
		});
	}

	await db.insert(fileSignerAmendments).values({
		filePieceCid: pieceCid,
		oldCommitment,
		newCommitment,
		amendTxHash: txHash.data as `0x${string}`,
	});

	return { txHash: txHash.data };
}
