/**
 * Piece-scoped document handlers migrated from api/routes/files/piece/.
 */
import {
	computeCommitment,
	jsonStringify,
	signatures,
	toBytes,
} from "@filosign/crypto-utils/node";
import {
	completionsMerkleRootV1,
	FILE_ACK_COLD_CLAIM_SENTINEL_V1,
	hashNormalizedSignerEmail,
	hashPrivySubjectCommitment,
	LEAF_SCHEMA_VERSION_V1,
	normalizePlacementRecipientEmail,
	requiredFieldIdsForRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track";
import {
	buildComplianceBundleAndHash,
	insertComplianceExportLog,
} from "@/lib/compliance/buildComplianceBundle";
import db from "@/lib/db";
import { isEnvelopeFullySigned } from "@/lib/domain/envelope-completion";
import {
	isSenderAlreadyApprovedError,
	primaryEmailForWallet,
} from "@/lib/domain/file-invites";
import { evmClient, fsContracts } from "@/lib/evm";
import { bucket } from "@/lib/s3/client";
import { tryCatch } from "@/lib/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/utils/zodHttp";

const { FSFileRegistry, FSManager } = fsContracts;
const {
	files,
	fileAcknowledgements,
	fileParticipants,
	fileSignatures,
	fileSignerDrafts,
	users,
} = db.schema;

/** --- detail --- */

export async function pieceDetail(userWallet: Address, pieceCid: string) {
	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			status: sql<"foc">`'foc'`.as("status"),
			onchainTxHash: files.onchainTxHash,
			createdAt: files.createdAt,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const participants = await db
		.select({
			wallet: fileParticipants.wallet,
			role: fileParticipants.role,
			kemCiphertext: fileParticipants.kemCiphertext,
			encryptedEncryptionKey: fileParticipants.encryptedEncryptionKey,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			username: users.username,
		})
		.from(fileParticipants)
		.leftJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(eq(fileParticipants.filePieceCid, pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	const userWalletNorm = getAddress(userWallet);
	const participantUser = participants.find(
		(p) => getAddress(p.wallet) === userWalletNorm,
	);
	if (!participantUser) {
		throw new ORPCError("FORBIDDEN", {
			message: "You dont have access to this file",
		});
	}

	const fileSignaturesRecord = await db
		.select({
			signer: fileSignatures.signer,
			timestamp: fileSignatures.createdAt,
			onchainTxHash: fileSignatures.onchainTxHash,
		})
		.from(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));

	const signers = participants
		.filter((p) => p.role === "signer")
		.map((p) => ({
			wallet: getAddress(p.wallet),
			name:
				[p.firstName, p.lastName].filter(Boolean).join(" ") ||
				p.username ||
				null,
			email: p.email || null,
		}))
		.sort((a, b) => a.wallet.localeCompare(b.wallet));

	const viewers = participants
		.filter((p) => p.role === "viewer")
		.map((p) => ({
			wallet: getAddress(p.wallet),
			name:
				[p.firstName, p.lastName].filter(Boolean).join(" ") ||
				p.username ||
				null,
			email: p.email || null,
		}))
		.sort((a, b) => a.wallet.localeCompare(b.wallet));

	const [acked] = await db
		.select()
		.from(fileAcknowledgements)
		.where(
			and(
				eq(fileAcknowledgements.filePieceCid, pieceCid),
				eq(fileAcknowledgements.wallet, userWalletNorm),
			),
		);
	const canRead = !!acked || getAddress(fileRecord.sender) === userWalletNorm;

	return {
		pieceCid: fileRecord.pieceCid,
		sender: fileRecord.sender,
		status: fileRecord.status,
		onchainTxHash: fileRecord.onchainTxHash,
		createdAt: fileRecord.createdAt,
		placementCommitment: fileRecord.placementCommitment,
		placementManifest: fileRecord.placementManifestJson,
		signers,
		viewers,
		signatures: fileSignaturesRecord,

		kemCiphertext: canRead ? participantUser.kemCiphertext : null,
		encryptedEncryptionKey: canRead
			? participantUser.encryptedEncryptionKey
			: null,
	};
}

/** --- ack --- */

const zPieceAckBody = z.object({
	signature: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
});

export async function pieceAck(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zPieceAckBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const { signature, timestamp } = parsedBody.data;

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
		})
		.from(files)
		.where(eq(files.pieceCid, args.pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
			email: users.email,
			privyDid: users.privyDid,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, fileRecord.pieceCid),
				eq(fileParticipants.wallet, args.userWallet),
			),
		);
	if (!participantRecord) {
		throw new ORPCError("NOT_FOUND", {
			message: "you are nto Participant in thies file",
		});
	}

	const [existingAck] = await db
		.select()
		.from(fileAcknowledgements)
		.where(
			and(
				eq(fileAcknowledgements.filePieceCid, args.pieceCid),
				eq(fileAcknowledgements.wallet, args.userWallet),
			),
		);
	if (existingAck && existingAck.ack !== FILE_ACK_COLD_CLAIM_SENTINEL_V1) {
		throw new ORPCError("CONFLICT", { message: "File already acked" });
	}

	const viewerAckEmailRaw = participantRecord.email?.trim();
	if (!viewerAckEmailRaw) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Profile email required to acknowledge",
		});
	}
	const viewerAckEmail = normalizePlacementRecipientEmail(viewerAckEmailRaw);
	const viewerEmailCommitment = hashNormalizedSignerEmail(viewerAckEmail);
	const privySubjectCommitment = hashPrivySubjectCommitment(
		participantRecord.privyDid,
	);

	const valid = await FSFileRegistry.read.validateFileAckSignature([
		args.pieceCid,
		fileRecord.sender,
		participantRecord.wallet,
		viewerEmailCommitment,
		privySubjectCommitment,
		BigInt(timestamp),
		signature,
	]);

	if (!valid) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}
	const walletNorm = getAddress(participantRecord.wallet);
	const createdAt = new Date(timestamp * 1000);
	const updatedAt = new Date();
	if (existingAck) {
		await db
			.update(fileAcknowledgements)
			.set({
				ack: signature,
				createdAt,
				updatedAt,
			})
			.where(
				and(
					eq(fileAcknowledgements.filePieceCid, args.pieceCid),
					eq(fileAcknowledgements.wallet, walletNorm),
				),
			);
	} else {
		await db.insert(fileAcknowledgements).values({
			filePieceCid: fileRecord.pieceCid,
			wallet: walletNorm,
			ack: signature,
			createdAt,
			updatedAt,
		});
	}

	const ackMode =
		existingAck?.ack === FILE_ACK_COLD_CLAIM_SENTINEL_V1 ? "cold" : "warm";
	trackServerEvent({
		distinctId: walletNorm,
		event: SERVER_ANALYTICS_EVENTS.pieceAcknowledged,
		pieceCid: args.pieceCid,
		properties: { mode: ackMode },
	});

	return {};
}

/** --- draft --- */

export async function pieceSignDraftGet(userWallet: Address, pieceCid: string) {
	const [fileRecord] = await db
		.select({
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (!participantRecord) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not required to sign this file",
		});
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to use placement drafts",
		});
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	const [draft] = await db
		.select({ completedFieldIds: fileSignerDrafts.completedFieldIds })
		.from(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, participantRecord.wallet),
			),
		);

	const stored = draft?.completedFieldIds ?? [];
	const completedFieldIds = stored.filter((id) => allowedIds.has(id));

	return { completedFieldIds };
}

const zSignDraftPutBody = z.object({
	completedFieldIds: z.array(z.string()),
});

export async function pieceSignDraftPut(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zSignDraftPutBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const { completedFieldIds: bodyIds } = parsedBody.data;
	const pieceCid = args.pieceCid;
	const userWallet = args.userWallet;

	const [fileRecord] = await db
		.select({
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (!participantRecord) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not required to sign this file",
		});
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to use placement drafts",
		});
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	for (const id of bodyIds) {
		if (!allowedIds.has(id)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "completedFieldIds must match manifest fields for signer",
			});
		}
	}

	const completedFieldIds = [...new Set(bodyIds)];
	const now = new Date();

	await db
		.insert(fileSignerDrafts)
		.values({
			filePieceCid: pieceCid,
			wallet: participantRecord.wallet,
			completedFieldIds,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [fileSignerDrafts.filePieceCid, fileSignerDrafts.wallet],
			set: {
				completedFieldIds,
				updatedAt: now,
			},
		});

	return { completedFieldIds };
}

/** --- s3 --- */

export async function pieceS3Url(userWallet: Address, pieceCid: string) {
	if (!pieceCid || typeof pieceCid !== "string") {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid pieceCid" });
	}

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", {
			message: "File not found or not allowed to access",
		});
	}

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
		})
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, fileRecord.pieceCid),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!participantRecord) {
		throw new ORPCError("NOT_FOUND", {
			message: "File not found or not allowed to access",
		});
	}

	const fileExists = await bucket.exists(`uploads/${pieceCid}`);

	if (!fileExists) {
		throw new ORPCError("NOT_FOUND", { message: "File not found on S3" });
	}

	const presignedUrl = bucket.presign(`uploads/${pieceCid}`, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	return { presignedUrl };
}

/** --- compliance --- */

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
			privyDid: users.privyDid,
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
		privyDid: p.privyDid ?? null,
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

/** --- sign --- */

export async function pieceSign(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const userWallet = args.userWallet;
	const pieceCid = args.pieceCid;
	const encoder = new TextEncoder();
	const dilithium = await signatures.dilithiumInstance();

	const parsedBody = z
		.object({
			signature: zHexString(),
			timestamp: z.number({ error: "timestamp must be a number" }),
			dl3Signature: zHexString(),
			completedFieldIds: z.array(z.string()).optional(),
			approveSender: z
				.object({
					nonce: z.coerce.bigint(),
					deadline: z.coerce.bigint(),
					signature: zHexString(),
				})
				.optional(),
		})
		.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const {
		signature,
		timestamp,
		dl3Signature,
		completedFieldIds,
		approveSender,
	} = parsedBody.data;

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
			privyDid: users.privyDid,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	if (!participantRecord) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not required to sign this file",
		});
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerAddr = getAddress(participantRecord.wallet);
	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to sign placement fields",
		});
	}
	const assignedForSigner = manifestParsed.data.fields.filter(
		(f) => f.assignedRecipientEmail === signerEmail,
	);
	const allowedIds = new Set(assignedForSigner.map((f) => f.id));

	const requiredIds = requiredFieldIdsForRecipientEmail(
		manifestParsed.data,
		signerEmail,
	);

	let fieldIds: string[];
	if (completedFieldIds !== undefined) {
		fieldIds = completedFieldIds;
		const completedSet = new Set(fieldIds);
		for (const id of fieldIds) {
			if (!allowedIds.has(id)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "completedFieldIds must match manifest fields for signer",
				});
			}
		}
		for (const req of requiredIds) {
			if (!completedSet.has(req)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "All required fields must be marked complete before signing",
				});
			}
		}
	} else {
		fieldIds = assignedForSigner.map((f) => f.id);
	}

	if (fieldIds.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No fields to complete for this signer",
		});
	}

	const completedFieldIdsStored = [...new Set(fieldIds)].sort((a, b) =>
		a.localeCompare(b),
	);

	let completionsRoot: `0x${string}`;
	try {
		completionsRoot = completionsMerkleRootV1({
			fieldIds: completedFieldIdsStored,
			placementCommitment: fileRecord.placementCommitment,
			pieceCid,
			signer: signerAddr,
		});
	} catch {
		throw new ORPCError("BAD_REQUEST", {
			message: "Could not compute completions root",
		});
	}

	const [{ signaturePublicKey: signerDl3PubKey }] = await db
		.select({
			signaturePublicKey: users.signaturePublicKey,
		})
		.from(users)
		.where(eq(users.walletAddress, participantRecord.wallet));

	const dl3SignatureMessage = jsonStringify({
		pieceCid,
		sender: fileRecord.sender,
		signer: participantRecord.wallet,
		timestamp,
		completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
	});
	const dl3SignatureCommitment = computeCommitment([dl3Signature]);

	const isDl3SignatureValid = await signatures.verify({
		dl: dilithium,
		message: encoder.encode(dl3SignatureMessage),
		signature: toBytes(dl3Signature),
		publicKey: toBytes(signerDl3PubKey),
	});

	if (!isDl3SignatureValid) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid DL3 signature" });
	}

	const signerEmailCommitment = hashNormalizedSignerEmail(signerEmail);

	const privySubjectCommitment = hashPrivySubjectCommitment(
		participantRecord.privyDid,
	);

	const registerSignatureArgs = [
		pieceCid,
		fileRecord.sender,
		participantRecord.wallet,
		signerEmailCommitment,
		privySubjectCommitment,
		dl3SignatureCommitment,
		BigInt(timestamp),
		signature,
		completionsRoot,
		LEAF_SCHEMA_VERSION_V1,
	] as const;

	try {
		await FSFileRegistry.simulate.registerFileSignature(registerSignatureArgs, {
			account: evmClient.account,
		});
	} catch (_err) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}

	const txHash = await FSFileRegistry.write.registerFileSignature(
		registerSignatureArgs,
	);
	let approveSenderTxHash: string | null = null;
	if (approveSender) {
		const approveSenderArgs = [
			participantRecord.wallet,
			fileRecord.sender,
			approveSender.nonce,
			approveSender.deadline,
			approveSender.signature,
		] as const;

		const approveSimulation = await tryCatch(
			FSManager.simulate.approveSender(approveSenderArgs, {
				account: evmClient.account,
			}),
		);
		if (
			approveSimulation.error &&
			!isSenderAlreadyApprovedError(approveSimulation.error)
		) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Invalid approveSender signature",
			});
		}

		if (!approveSimulation.error) {
			const approveWrite = await tryCatch(
				FSManager.write.approveSender(approveSenderArgs),
			);
			if (approveWrite.error) {
				if (!isSenderAlreadyApprovedError(approveWrite.error)) {
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Could not approve sender",
					});
				}
			} else {
				approveSenderTxHash = approveWrite.data;
			}
		}
	}

	await db.insert(fileSignatures).values({
		filePieceCid: pieceCid,
		signer: signerAddr,
		evmSignature: signature,
		dl3Signature: dl3Signature,
		onchainTxHash: txHash,
		completedFieldIds: completedFieldIdsStored,
		completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
		createdAt: new Date(timestamp * 1000),
	});

	await db
		.delete(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, participantRecord.wallet),
			),
		);

	trackServerEvent({
		distinctId: signerAddr,
		event: SERVER_ANALYTICS_EVENTS.pieceSigned,
		pieceCid,
		properties: {
			field_count: completedFieldIdsStored.length,
		},
	});

	if (await isEnvelopeFullySigned(pieceCid)) {
		trackServerEvent({
			distinctId: getAddress(fileRecord.sender),
			event: SERVER_ANALYTICS_EVENTS.envelopeFullySigned,
			pieceCid,
		});
	}

	return { txHash, signature, approveSenderTxHash };
}
