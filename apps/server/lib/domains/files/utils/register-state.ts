import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import type { FileRegistrationStatus } from "@/lib/platform/db/schema/file";

const { fileRegisterStates } = db.schema;

export type StoredRegisterRetryPayload = {
	sender: Address;
	rawBody: unknown;
	activeOrg: ActiveOrgContext;
};

export async function getRegisterState(pieceCid: string) {
	const [row] = await db
		.select({
			pieceCid: fileRegisterStates.pieceCid,
			sender: fileRegisterStates.sender,
			registrationStatus: fileRegisterStates.registrationStatus,
			registerError: fileRegisterStates.registerError,
			registerPayloadJson: fileRegisterStates.registerPayloadJson,
		})
		.from(fileRegisterStates)
		.where(eq(fileRegisterStates.pieceCid, pieceCid))
		.limit(1);
	return row ?? null;
}

export async function upsertRegisteringState(args: {
	pieceCid: string;
	sender: Address;
	payload: StoredRegisterRetryPayload;
}): Promise<void> {
	const now = new Date();
	await db
		.insert(fileRegisterStates)
		.values({
			pieceCid: args.pieceCid,
			sender: getAddress(args.sender),
			registrationStatus: "registering",
			registerError: null,
			registerAttemptedAt: now,
			registerPayloadJson: args.payload,
		})
		.onConflictDoUpdate({
			target: fileRegisterStates.pieceCid,
			set: {
				sender: getAddress(args.sender),
				registrationStatus: "registering",
				registerError: null,
				registerAttemptedAt: now,
				registerPayloadJson: args.payload,
			},
		});
}

export async function markRegisterFailed(
	pieceCid: string,
	error: string,
): Promise<void> {
	await db
		.update(fileRegisterStates)
		.set({
			registrationStatus: "failed" satisfies FileRegistrationStatus,
			registerError: error.slice(0, 2000),
			registerAttemptedAt: new Date(),
		})
		.where(eq(fileRegisterStates.pieceCid, pieceCid));
}

export async function clearRegisterState(pieceCid: string): Promise<void> {
	await db
		.delete(fileRegisterStates)
		.where(eq(fileRegisterStates.pieceCid, pieceCid));
}
