import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { z } from "zod";
import db from "@/lib/platform/db";

const { userSignatures } = db.schema;

export const zUserSignatureCreateBody = z.object({
	data: z.string(),
});

export async function userSignaturesCreate(wallet: Address, body: unknown) {
	const parsedBody = zUserSignatureCreateBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	try {
		await db.insert(userSignatures).values({
			walletAddress: wallet,
			data: parsedBody.data.data,
		});
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Failed to upload signature ${error}`,
		});
	}

	return {};
}

export async function userSignaturesList(wallet: Address) {
	const dbEntries = await db
		.select()
		.from(userSignatures)
		.where(eq(userSignatures.walletAddress, wallet));

	return { signatures: dbEntries };
}

export async function userSignaturesGetById(wallet: Address, id: string) {
	const [dbEntry] = await db
		.select()
		.from(userSignatures)
		.where(
			and(eq(userSignatures.id, id), eq(userSignatures.walletAddress, wallet)),
		);

	if (!dbEntry) {
		throw new ORPCError("NOT_FOUND", { message: "Signature not found" });
	}

	return dbEntry;
}
