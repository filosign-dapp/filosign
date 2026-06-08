import { computeCidIdentifier } from "@filosign/contracts";
import { throwAppError } from "@filosign/errors/server";
import {
	normalizePlacementRecipientEmail,
	type PlacementManifest,
	type RegisterRoutingInput,
	zPlacementManifest,
	zRegisterRoutingInput,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { inviteExpiresAt } from "@/lib/domains/invites";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import { invalidateNotificationsInbox } from "@/lib/platform/cache/invalidate";
import db from "@/lib/platform/db";
import type { PendingNewSignerJson } from "@/lib/platform/db/schema/file";
import {
	fsEnvelopeRegistryAt,
	relayCancelSignerReplacement,
	relayExecuteSignerReplacement,
	relayProposeSignerReplacement,
} from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { primaryEmailForWallet } from "./invites";
import { assertRecallerMayRelay } from "./recall-auth";
import {
	zCancelSignerReplacementBody,
	zExecuteSignerReplacementBody,
	zProposeSignerReplacementBody,
} from "./utils/amend-schemas";
import {
	patchRoutingCalldataForAmend,
	resolveSignRoutingCalldata,
} from "./utils/routing-calldata";

export {
	zCancelSignerReplacementBody,
	zExecuteSignerReplacementBody,
	zNewSignerE2ee,
	zPendingColdSignerE2ee,
	zPendingWarmSignerE2ee,
	zProposeSignerReplacementBody,
} from "./utils/amend-schemas";

const {
	files,
	fileParticipants,
	fileColdInvites,
	fileSignatures,
	fileSignerDrafts,
	fileSignerAmendments,
	fileAcknowledgements,
	fileSettlementRecipientAcks,
	users,
} = db.schema;

type FileRow = {
	sender: Address;
	organizationId: string;
	registryAddress: `0x${string}`;
	revokedBeforeCompletedAt: Date | null;
	completedAt: Date | null;
	placementManifestJson: PlacementManifest;
	registerRoutingJson: RegisterRoutingInput | null;
};

async function loadFileForReplacement(
	pieceCid: string,
): Promise<FileRow | null> {
	const [file] = await db
		.select({
			sender: files.sender,
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			completedAt: files.completedAt,
			placementManifestJson: files.placementManifestJson,
			registerRoutingJson: files.registerRoutingJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (!file) return null;
	const manifestParsed = zPlacementManifest.safeParse(
		file.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "File placement manifest missing or invalid",
		});
	}
	const registerRoutingParsed = zRegisterRoutingInput.safeParse(
		file.registerRoutingJson ?? {},
	);
	return {
		...file,
		placementManifestJson: manifestParsed.data,
		registerRoutingJson: registerRoutingParsed.success
			? registerRoutingParsed.data
			: null,
	};
}

function assertFileOpenForReplacement(file: FileRow): void {
	if (file.revokedBeforeCompletedAt) {
		throw throwAppError("FILES.ENVELOPE_VOIDED");
	}
	if (file.completedAt) {
		throw throwAppError("FILES.ENVELOPE_COMPLETE");
	}
}

async function assertNoDbPendingAmendment(pieceCid: string): Promise<void> {
	const [row] = await db
		.select({ id: fileSignerAmendments.id })
		.from(fileSignerAmendments)
		.where(
			and(
				eq(fileSignerAmendments.filePieceCid, pieceCid),
				eq(fileSignerAmendments.status, "pending"),
			),
		)
		.limit(1);
	if (row) {
		throw throwAppError("FILES.REPLACEMENT_PENDING");
	}
}

export async function readPendingSignerReplacementForPiece(pieceCid: string) {
	const [row] = await db
		.select({
			id: fileSignerAmendments.id,
			oldCommitment: fileSignerAmendments.oldCommitment,
			newCommitment: fileSignerAmendments.newCommitment,
			status: fileSignerAmendments.status,
			proposeTxHash: fileSignerAmendments.proposeTxHash,
			createdAt: fileSignerAmendments.createdAt,
		})
		.from(fileSignerAmendments)
		.where(
			and(
				eq(fileSignerAmendments.filePieceCid, pieceCid),
				eq(fileSignerAmendments.status, "pending"),
			),
		)
		.limit(1);
	return row ?? null;
}

export async function isSignerReplacementPendingOnChain(
	registryAddress: `0x${string}`,
	pieceCid: string,
): Promise<boolean> {
	const registry = fsEnvelopeRegistryAt(registryAddress);
	const cidId = computeCidIdentifier(pieceCid);
	const res = await tryCatch(
		registry.read.getPendingSignerReplacement([cidId]),
	);
	if (res.error) return false;
	return Boolean(res.data[0]);
}

async function resolveEmailForCommitment(
	pieceCid: string,
	commitment: Hex,
): Promise<string | null> {
	const [coldHit] = await db
		.select({ email: fileColdInvites.email })
		.from(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.filePieceCid, pieceCid),
				eq(fileColdInvites.isSigner, true),
				eq(fileColdInvites.emailCommitment, commitment),
			),
		)
		.limit(1);
	if (coldHit) {
		return normalizePlacementRecipientEmail(coldHit.email);
	}

	const [warmHit] = await db
		.select({ email: users.email })
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.emailCommitment, commitment),
			),
		)
		.limit(1);
	if (warmHit?.email) {
		return normalizePlacementRecipientEmail(warmHit.email);
	}

	return null;
}

function patchRegisterRoutingEmails(
	routing: RegisterRoutingInput | null,
	oldEmail: string,
	newEmail: string,
): RegisterRoutingInput | null {
	if (!routing) return routing;
	const norm = (e: string) => e.trim().toLowerCase();
	const oldNorm = norm(oldEmail);
	const replaceList = (list?: string[]) =>
		list?.map((e) => (norm(e) === oldNorm ? newEmail : e));
	return {
		...routing,
		routingOrderEmails: replaceList(routing.routingOrderEmails),
		quorumSetEmails: replaceList(routing.quorumSetEmails),
	};
}

function patchPlacementManifestEmails<T extends PlacementManifest>(
	manifest: T,
	oldEmail: string,
	newEmail: string,
): T {
	const oldNorm = oldEmail.trim().toLowerCase();
	return {
		...manifest,
		fields: manifest.fields.map((f) =>
			f.assignedRecipientEmail.trim().toLowerCase() === oldNorm
				? { ...f, assignedRecipientEmail: newEmail }
				: f,
		),
	} as T;
}

async function applyParticipantSwapInTx(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	args: {
		pieceCid: string;
		oldCommitment: Hex;
		newCommitment: Hex;
		newSignerE2ee: PendingNewSignerJson;
		placementManifest: PlacementManifest;
		registerRouting: RegisterRoutingInput | null;
		routingCalldataAfter: { routingOrder: Hex[]; quorumSet: Hex[] };
	},
): Promise<{
	placementManifest: PlacementManifest;
	registerRouting: RegisterRoutingInput | null;
}> {
	const oldEmail = await resolveEmailForCommitment(
		args.pieceCid,
		args.oldCommitment,
	);
	const newEmail =
		args.newSignerE2ee.kind === "cold"
			? normalizePlacementRecipientEmail(args.newSignerE2ee.email)
			: ((await primaryEmailForWallet(getAddress(args.newSignerE2ee.wallet))) ??
				null);

	let placementManifest = args.placementManifest;
	let registerRouting = args.registerRouting;
	if (oldEmail && newEmail) {
		placementManifest = patchPlacementManifestEmails(
			placementManifest,
			oldEmail,
			newEmail,
		);
		registerRouting = patchRegisterRoutingEmails(
			registerRouting,
			oldEmail,
			newEmail,
		);
	}

	await tx
		.delete(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, args.pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.emailCommitment, args.oldCommitment),
			),
		);

	await tx
		.delete(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.filePieceCid, args.pieceCid),
				eq(fileColdInvites.isSigner, true),
				eq(fileColdInvites.emailCommitment, args.oldCommitment),
			),
		);

	if (args.newSignerE2ee.kind === "warm") {
		await tx.insert(fileParticipants).values({
			filePieceCid: args.pieceCid,
			wallet: getAddress(args.newSignerE2ee.wallet),
			role: "signer",
			emailCommitment: args.newCommitment,
			kemCiphertext: args.newSignerE2ee.kemCiphertext,
			encryptedEncryptionKey: args.newSignerE2ee.encryptedEncryptionKey,
		});
	} else {
		await tx.insert(fileColdInvites).values({
			filePieceCid: args.pieceCid,
			email: normalizePlacementRecipientEmail(args.newSignerE2ee.email),
			emailCommitment: args.newCommitment,
			inviteToken: args.newSignerE2ee.inviteToken,
			wrappedEncryptionKey: args.newSignerE2ee.wrappedEncryptionKey,
			isSigner: true,
			status: "pending",
			expiresAt: inviteExpiresAt(),
		});
	}

	await tx
		.update(files)
		.set({
			placementManifestJson: placementManifest,
			registerRoutingJson: registerRouting,
			completedAt: null,
			updatedAt: new Date(),
		})
		.where(eq(files.pieceCid, args.pieceCid));

	return { placementManifest, registerRouting };
}

async function clearEnvelopeProgressInDb(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	pieceCid: string,
): Promise<void> {
	await tx
		.delete(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));
	await tx
		.delete(fileSignerDrafts)
		.where(eq(fileSignerDrafts.filePieceCid, pieceCid));
	await tx
		.delete(fileAcknowledgements)
		.where(eq(fileAcknowledgements.filePieceCid, pieceCid));
	await tx
		.delete(fileSettlementRecipientAcks)
		.where(eq(fileSettlementRecipientAcks.filePieceCid, pieceCid));
	await cancelPendingSignerAmendmentsForPiece(tx, pieceCid);
	await tx
		.update(files)
		.set({ completedAt: null, updatedAt: new Date() })
		.where(eq(files.pieceCid, pieceCid));
}

/** Clears on-chain signature progress mirrored in Postgres (signatures, acks, drafts). */
export async function wipeEnvelopeSigningProgressForPiece(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	pieceCid: string,
): Promise<void> {
	await clearEnvelopeProgressInDb(tx, pieceCid);
}

export async function filesProposeSignerReplacement(
	wallet: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsed = zProposeSignerReplacementBody.safeParse(rawBody);
	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}

	const {
		pieceCid,
		recaller,
		oldCommitment,
		newCommitment,
		timestamp,
		signature,
		newSignerE2ee,
	} = parsed.data;

	const file = await loadFileForReplacement(pieceCid);
	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}
	assertFileOpenForReplacement(file);
	await assertNoDbPendingAmendment(pieceCid);

	const baseRouting = resolveSignRoutingCalldata({
		placementManifest: file.placementManifestJson,
		registerRouting: file.registerRoutingJson,
	});
	const routingCalldata = patchRoutingCalldataForAmend({
		...baseRouting,
		oldCommitment,
		newCommitment,
	});

	await assertRecallerMayRelay({
		wallet,
		file: {
			sender: file.sender,
			organizationId: file.organizationId,
		},
		recaller,
		activeOrg,
		registryAddress: file.registryAddress,
	});

	const registry = fsEnvelopeRegistryAt(file.registryAddress);
	const proposeArgs = [
		pieceCid,
		recaller,
		oldCommitment,
		newCommitment,
		BigInt(timestamp),
		signature,
		baseRouting.routingOrder,
		routingCalldata.routingOrder,
		baseRouting.quorumSet,
		routingCalldata.quorumSet,
	] as const;

	const txHash = await tryCatch(
		relayProposeSignerReplacement(registry, proposeArgs),
	);
	if (txHash.error) {
		throw throwAppError("FILES.REPLACEMENT_RELAY_FAILED", {
			params: {
				reason:
					txHash.error instanceof Error
						? txHash.error.message
						: "proposeSignerReplacement relay failed",
			},
		});
	}

	const chainPending = await isSignerReplacementPendingOnChain(
		file.registryAddress,
		pieceCid,
	);

	await db.transaction(async (tx) => {
		if (chainPending) {
			await tx.insert(fileSignerAmendments).values({
				filePieceCid: pieceCid,
				oldCommitment,
				newCommitment,
				status: "pending",
				pendingNewSignerJson: newSignerE2ee,
				proposeTxHash: txHash.data as `0x${string}`,
			});
			return;
		}

		await applyParticipantSwapInTx(tx, {
			pieceCid,
			oldCommitment,
			newCommitment,
			newSignerE2ee,
			placementManifest: file.placementManifestJson,
			registerRouting: file.registerRoutingJson,
			routingCalldataAfter: routingCalldata,
		});

		await tx.insert(fileSignerAmendments).values({
			filePieceCid: pieceCid,
			oldCommitment,
			newCommitment,
			status: "executed",
			pendingNewSignerJson: newSignerE2ee,
			proposeTxHash: txHash.data as `0x${string}`,
			executeTxHash: txHash.data as `0x${string}`,
		});
	});

	if (newSignerE2ee.kind === "warm") {
		await invalidateNotificationsInbox(newSignerE2ee.wallet);
	}

	return {
		txHash: txHash.data,
		pending: chainPending,
	};
}

export async function filesExecuteSignerReplacement(
	wallet: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsed = zExecuteSignerReplacementBody.safeParse(rawBody);
	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}

	const { pieceCid, recaller } = parsed.data;

	const file = await loadFileForReplacement(pieceCid);
	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}
	assertFileOpenForReplacement(file);

	const [pendingRow] = await db
		.select()
		.from(fileSignerAmendments)
		.where(
			and(
				eq(fileSignerAmendments.filePieceCid, pieceCid),
				eq(fileSignerAmendments.status, "pending"),
			),
		)
		.limit(1);
	const pendingE2ee = pendingRow?.pendingNewSignerJson;
	if (!pendingRow || !pendingE2ee) {
		throw throwAppError("FILES.NO_PENDING_REPLACEMENT");
	}

	const baseRouting = resolveSignRoutingCalldata({
		placementManifest: file.placementManifestJson,
		registerRouting: file.registerRoutingJson,
	});
	const routingCalldata = patchRoutingCalldataForAmend({
		...baseRouting,
		oldCommitment: pendingRow.oldCommitment,
		newCommitment: pendingRow.newCommitment,
	});

	await assertRecallerMayRelay({
		wallet,
		file: {
			sender: file.sender,
			organizationId: file.organizationId,
		},
		recaller,
		activeOrg,
		registryAddress: file.registryAddress,
	});

	const registry = fsEnvelopeRegistryAt(file.registryAddress);
	const txHash = await tryCatch(
		relayExecuteSignerReplacement(registry, [
			pieceCid,
			recaller,
			routingCalldata.routingOrder,
			routingCalldata.quorumSet,
		]),
	);
	if (txHash.error) {
		throw throwAppError("FILES.REPLACEMENT_RELAY_FAILED", {
			params: {
				reason:
					txHash.error instanceof Error
						? txHash.error.message
						: "executeSignerReplacement relay failed",
			},
		});
	}

	await db.transaction(async (tx) => {
		await wipeEnvelopeSigningProgressForPiece(tx, pieceCid);
		await applyParticipantSwapInTx(tx, {
			pieceCid,
			oldCommitment: pendingRow.oldCommitment,
			newCommitment: pendingRow.newCommitment,
			newSignerE2ee: pendingE2ee,
			placementManifest: file.placementManifestJson,
			registerRouting: file.registerRoutingJson,
			routingCalldataAfter: routingCalldata,
		});
		await tx
			.update(fileSignerAmendments)
			.set({
				status: "executed",
				executeTxHash: txHash.data as `0x${string}`,
			})
			.where(eq(fileSignerAmendments.id, pendingRow.id));
	});

	if (pendingE2ee.kind === "warm") {
		await invalidateNotificationsInbox(pendingE2ee.wallet);
	}

	return { txHash: txHash.data };
}

export async function filesCancelSignerReplacement(
	wallet: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsed = zCancelSignerReplacementBody.safeParse(rawBody);
	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}

	const { pieceCid, recaller, timestamp, signature } = parsed.data;

	const file = await loadFileForReplacement(pieceCid);
	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}
	assertFileOpenForReplacement(file);

	const [pendingRow] = await db
		.select({ id: fileSignerAmendments.id })
		.from(fileSignerAmendments)
		.where(
			and(
				eq(fileSignerAmendments.filePieceCid, pieceCid),
				eq(fileSignerAmendments.status, "pending"),
			),
		)
		.limit(1);
	if (!pendingRow) {
		throw throwAppError("FILES.NO_PENDING_REPLACEMENT");
	}

	await assertRecallerMayRelay({
		wallet,
		file: {
			sender: file.sender,
			organizationId: file.organizationId,
		},
		recaller,
		activeOrg,
		registryAddress: file.registryAddress,
	});

	const registry = fsEnvelopeRegistryAt(file.registryAddress);
	const txHash = await tryCatch(
		relayCancelSignerReplacement(registry, [
			pieceCid,
			recaller,
			BigInt(timestamp),
			signature,
		]),
	);
	if (txHash.error) {
		throw throwAppError("FILES.REPLACEMENT_RELAY_FAILED", {
			params: {
				reason:
					txHash.error instanceof Error
						? txHash.error.message
						: "cancelSignerReplacement relay failed",
			},
		});
	}

	await db
		.update(fileSignerAmendments)
		.set({
			status: "cancelled",
			cancelTxHash: txHash.data as `0x${string}`,
		})
		.where(eq(fileSignerAmendments.id, pendingRow.id));

	return { txHash: txHash.data };
}

export async function cancelPendingSignerAmendmentsForPiece(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	pieceCid: string,
): Promise<void> {
	await tx
		.update(fileSignerAmendments)
		.set({ status: "cancelled" })
		.where(
			and(
				eq(fileSignerAmendments.filePieceCid, pieceCid),
				eq(fileSignerAmendments.status, "pending"),
			),
		);
}
