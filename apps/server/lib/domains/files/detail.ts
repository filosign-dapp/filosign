import { zPlacementManifest } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { listSupplementaryPacketsForParticipant } from "@/lib/domains/attachments";
import { getOrgMemberWithDocumentRead } from "@/lib/domains/orgs";
import {
	buildComplianceBundleAndHash,
	insertComplianceExportLog,
} from "@/lib/platform/compliance";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { primaryEmailForWallet } from "./invites";
import {
	getDocumentView,
	getValidAck,
	listConditionalAttachmentPacketsForSender,
	readEnvelopeRegistryProgress,
} from "./utils/piece-helpers";

const { files, fileParticipants, fileSignatures, users } = db.schema;

export async function pieceDetail(userWallet: Address, pieceCid: string) {
	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			registryAddress: files.registryAddress,
			sender: files.sender,
			organizationId: files.organizationId,
			orgKemCiphertext: files.orgKemCiphertext,
			orgEncryptedEncryptionKey: files.orgEncryptedEncryptionKey,
			status: files.status,
			onchainTxHash: files.onchainTxHash,
			createdAt: files.createdAt,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
			registerRoutingJson: files.registerRoutingJson,
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

	const orgRead =
		!participantUser &&
		fileRecord.organizationId &&
		(await getOrgMemberWithDocumentRead(
			userWalletNorm,
			fileRecord.organizationId,
		));

	if (!participantUser && !orgRead) {
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

	const rosterPerson = (p: (typeof participants)[number]) => ({
		wallet: getAddress(p.wallet),
		name:
			[p.firstName, p.lastName].filter(Boolean).join(" ") || p.username || null,
		email: p.email || null,
	});

	const signerParticipants = participants.filter((p) => p.role === "signer");

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

	const isSender = getAddress(fileRecord.sender) === userWalletNorm;
	const validAck = participantUser
		? await getValidAck(userWalletNorm, pieceCid)
		: null;
	const documentView = participantUser
		? await getDocumentView(userWalletNorm, pieceCid)
		: null;

	const mySignature = fileSignaturesRecord.find(
		(s) => getAddress(s.signer) === userWalletNorm,
	);

	const senderEmail = isSender
		? await primaryEmailForWallet(userWalletNorm)
		: null;
	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	const senderWallet = getAddress(fileRecord.sender);
	const senderParticipant = participants.find(
		(p) => getAddress(p.wallet) === senderWallet,
	);
	let senderEmailForManifest: string | null =
		senderParticipant?.email ?? senderEmail;
	if (
		!senderEmailForManifest &&
		manifestParsed.success &&
		manifestParsed.data.fields.length > 0
	) {
		senderEmailForManifest = await primaryEmailForWallet(senderWallet);
	}
	const senderHasAssignedFields = Boolean(
		senderEmailForManifest &&
			manifestParsed.success &&
			manifestParsed.data.fields.some(
				(f) => f.assignedRecipientEmail === senderEmailForManifest,
			),
	);

	const signers = [
		...signerParticipants.map(rosterPerson),
		...(senderHasAssignedFields &&
		!signerParticipants.some((p) => getAddress(p.wallet) === senderWallet)
			? [
					senderParticipant
						? rosterPerson(senderParticipant)
						: {
								wallet: senderWallet,
								name: null,
								email: senderEmailForManifest,
							},
				]
			: []),
	].sort((a, b) => a.wallet.localeCompare(b.wallet));

	const isSigner =
		(participantUser?.role === "signer" && !isSender && !mySignature) ||
		(isSender && senderHasAssignedFields && !mySignature);

	const canDecryptParticipant =
		Boolean(participantUser) && (isSender || Boolean(validAck));
	const canReadOrg = Boolean(orgRead);

	const acknowledged = Boolean(validAck);
	const acknowledgedAt = validAck?.acknowledgedAt.toISOString() ?? null;
	const firstViewedAt = documentView?.firstViewedAt.toISOString() ?? null;

	const signerEmailForRouting =
		isSender && senderEmailForManifest
			? senderEmailForManifest
			: (participantUser?.email ?? null);
	const envelopeProgress = await readEnvelopeRegistryProgress({
		pieceCid,
		registryAddress: fileRecord.registryAddress,
		registerRouting: fileRecord.registerRoutingJson ?? undefined,
		signerEmail: signerEmailForRouting,
	});

	const canSignByRouting = envelopeProgress?.canSignByRouting ?? true;
	const canSign = Boolean(
		isSigner &&
			(isSender || (acknowledged && firstViewedAt)) &&
			!mySignature &&
			canSignByRouting,
	);

	const manifestUnlocked =
		isSender ||
		canReadOrg ||
		(participantUser?.role === "signer"
			? acknowledged && Boolean(firstViewedAt)
			: acknowledged);

	const conditionalAttachmentPackets = isSender
		? await listConditionalAttachmentPacketsForSender(pieceCid)
		: undefined;

	const signerEmails = signers
		.map((s) => s.email)
		.filter((email): email is string => Boolean(email));

	const mySupplementaryPackets =
		participantUser && !isSender
			? await listSupplementaryPacketsForParticipant({
					userWallet: userWalletNorm,
					pieceCid,
					signerEmails,
				})
			: [];

	return {
		pieceCid: fileRecord.pieceCid,
		registryAddress: fileRecord.registryAddress,
		sender: fileRecord.sender,
		status: fileRecord.status,
		onchainTxHash: fileRecord.onchainTxHash,
		createdAt: fileRecord.createdAt,
		placementCommitment: fileRecord.placementCommitment,
		placementManifest: manifestUnlocked
			? fileRecord.placementManifestJson
			: null,
		signers,
		viewers,
		signatures: fileSignaturesRecord,
		participantAccess: {
			acknowledged,
			acknowledgedAt,
			firstViewedAt,
			canDecrypt:
				canDecryptParticipant ||
				canReadOrg ||
				(isSender && Boolean(participantUser)),
			canSign,
			canSignByRouting,
		},
		envelopeProgress: envelopeProgress
			? {
					routingMode: envelopeProgress.routingMode,
					requiredSignersCount: envelopeProgress.requiredSignersCount,
					requiredSignaturesCount: envelopeProgress.requiredSignaturesCount,
					quorumN: envelopeProgress.quorumN,
					completedAt: envelopeProgress.completedAt,
					revokedBeforeCompletedAt: envelopeProgress.revokedBeforeCompletedAt,
					revokedBy: envelopeProgress.revokedBy,
					nextSignerEmail: envelopeProgress.nextSignerEmail,
				}
			: null,
		...(conditionalAttachmentPackets ? { conditionalAttachmentPackets } : {}),
		...(mySupplementaryPackets.length > 0 ? { mySupplementaryPackets } : {}),

		kemCiphertext:
			canDecryptParticipant && participantUser
				? participantUser.kemCiphertext
				: null,
		encryptedEncryptionKey:
			canDecryptParticipant && participantUser
				? participantUser.encryptedEncryptionKey
				: null,
		orgKemCiphertext: canReadOrg ? fileRecord.orgKemCiphertext : null,
		orgEncryptedEncryptionKey: canReadOrg
			? fileRecord.orgEncryptedEncryptionKey
			: null,
		organizationId: canReadOrg ? fileRecord.organizationId : null,
	};
}

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
