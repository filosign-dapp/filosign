import { throwAppError } from "@filosign/errors/server";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { z } from "zod";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { userSignatures } = db.schema;

export const zUserSignatureCreateBody = z.object({
	data: z.string(),
});

export async function userSignaturesCreate(wallet: Address, body: unknown) {
	const parsedBody = zUserSignatureCreateBody.safeParse(body);

	if (parsedBody.error) {
		throw throwZodBadRequest(parsedBody.error);
	}

	try {
		await db.insert(userSignatures).values({
			walletAddress: wallet,
			data: parsedBody.data.data,
		});
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
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
		throw throwAppError("USERS.SIGNATURE_NOT_FOUND");
	}

	return dbEntry;
}
