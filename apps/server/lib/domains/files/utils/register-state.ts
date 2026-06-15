import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { z } from "zod";
import db from "@/lib/platform/db";
import type { FileRegistrationStatus } from "@/lib/platform/db/schema/file";

/** Call-time schema access so Bun `mock.module("@/lib/platform/db")` stays effective across the shared test module cache. */
function schema() {
	return db.schema;
}

const zStoredRegisterRetryPayload = z.object({
	sender: zEvmAddress(),
	rawBody: z.unknown(),
	activeOrg: z
		.object({
			organizationId: z.uuid(),
			role: z.enum(["owner", "admin", "sender", "viewer"]),
			encryptionPublicKey: zHexString(),
			signingMode: z.enum(["acting_member", "org_safe"]),
		})
		.nullable(),
});

export type StoredRegisterRetryPayload = z.infer<
	typeof zStoredRegisterRetryPayload
>;

export function parseStoredRegisterRetryPayload(
	json: unknown,
): StoredRegisterRetryPayload | null {
	const parsed = zStoredRegisterRetryPayload.safeParse(json);
	return parsed.success ? parsed.data : null;
}

export async function getRegisterState(pieceCid: string) {
	const { fileRegisterStates } = schema();
	const [row] = await db
		.select({
			pieceCid: fileRegisterStates.pieceCid,
			sender: fileRegisterStates.sender,
			registrationStatus: fileRegisterStates.registrationStatus,
			registerError: fileRegisterStates.registerError,
			registerPayloadJson: fileRegisterStates.registerPayloadJson,
			assignedRelayerAddress: fileRegisterStates.assignedRelayerAddress,
			pendingTxHash: fileRegisterStates.pendingTxHash,
		})
		.from(fileRegisterStates)
		.where(eq(fileRegisterStates.pieceCid, pieceCid))
		.limit(1);
	return row ?? null;
}

export async function upsertQueuedState(args: {
	pieceCid: string;
	sender: Address;
	payload: StoredRegisterRetryPayload;
	assignedRelayerAddress: Address;
}): Promise<void> {
	const { fileRegisterStates } = schema();
	const now = new Date();
	await db
		.insert(fileRegisterStates)
		.values({
			pieceCid: args.pieceCid,
			sender: getAddress(args.sender),
			registrationStatus: "queued",
			registerError: null,
			registerAttemptedAt: now,
			registerPayloadJson: args.payload,
			assignedRelayerAddress: getAddress(args.assignedRelayerAddress),
			pendingTxHash: null,
		})
		.onConflictDoUpdate({
			target: fileRegisterStates.pieceCid,
			set: {
				sender: getAddress(args.sender),
				registrationStatus: "queued",
				registerError: null,
				registerAttemptedAt: now,
				registerPayloadJson: args.payload,
				assignedRelayerAddress: getAddress(args.assignedRelayerAddress),
				pendingTxHash: null,
			},
		});
}

export async function markRegisteringState(pieceCid: string): Promise<void> {
	const { fileRegisterStates } = schema();
	await db
		.update(fileRegisterStates)
		.set({
			registrationStatus: "registering" satisfies FileRegistrationStatus,
			registerError: null,
			registerAttemptedAt: new Date(),
		})
		.where(eq(fileRegisterStates.pieceCid, pieceCid));
}

export async function setRegisterPendingTxHash(
	pieceCid: string,
	pendingTxHash: Hex,
): Promise<void> {
	const { fileRegisterStates } = schema();
	await db
		.update(fileRegisterStates)
		.set({ pendingTxHash })
		.where(eq(fileRegisterStates.pieceCid, pieceCid));
}

export async function markRegisterFailed(
	pieceCid: string,
	error: string,
): Promise<void> {
	const { fileRegisterStates } = schema();
	await db
		.update(fileRegisterStates)
		.set({
			registrationStatus: "failed" satisfies FileRegistrationStatus,
			registerError: error.slice(0, 2000),
			registerAttemptedAt: new Date(),
			pendingTxHash: null,
		})
		.where(eq(fileRegisterStates.pieceCid, pieceCid));
}

export async function clearRegisterState(pieceCid: string): Promise<void> {
	const { fileRegisterStates } = schema();
	await db
		.delete(fileRegisterStates)
		.where(eq(fileRegisterStates.pieceCid, pieceCid));
}

export type RegistrationStatusSnapshot = {
	registrationStatus: FileRegistrationStatus;
	registerError: string | null;
	onchainTxHash: Hex | null;
};

export async function readRegistrationStatusSnapshot(
	pieceCid: string,
): Promise<RegistrationStatusSnapshot | null> {
	const { files } = schema();
	const [fileRow] = await db
		.select({
			onchainTxHash: files.onchainTxHash,
			registrationStatus: files.registrationStatus,
			registerError: files.registerError,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	if (fileRow) {
		return {
			registrationStatus: fileRow.registrationStatus,
			registerError: fileRow.registerError,
			onchainTxHash: fileRow.onchainTxHash,
		};
	}

	const state = await getRegisterState(pieceCid);
	if (!state) {
		return null;
	}

	return {
		registrationStatus: state.registrationStatus,
		registerError: state.registerError,
		onchainTxHash: state.pendingTxHash,
	};
}
