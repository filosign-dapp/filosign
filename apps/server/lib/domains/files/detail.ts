import { check } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { zEnvelopeMetadata, zPlacementManifest } from "@filosign/shared";
import { and, desc, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { z } from "zod";
import type { RpcPieceDetailOutput } from "@/api/orpc/schemas/files-piece-output";
import { listSupplementaryPacketsForParticipant } from "@/lib/domains/attachments";
import { resolveEntitlementContext } from "@/lib/domains/entitlements";
import { syncSettlementPayoutFromChain } from "@/lib/domains/settlements/utils/sync-from-chain";
import {
	buildComplianceBundleAndHash,
	insertComplianceExportLog,
} from "@/lib/platform/compliance";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { primaryEmailForWallet } from "./invites";
import { readPendingSignerReplacementForPiece } from "./signer-replacement";
import {
	assertExportDocumentSha256Matches,
	ExportDocumentSha256MismatchError,
	isComplianceExportAllowed,
} from "./utils/compliance-export";
import { listPieceFieldCompletions } from "./utils/field-completions";
import {
	resolvePieceDetailAccess,
	rosterPerson,
} from "./utils/piece-detail/access";
import {
	buildPieceDetailResponse,
	computePieceDetailPermissions,
} from "./utils/piece-detail/permissions";
import {
	buildPieceDetailSigners,
	resolveSenderEmailForManifest,
	senderHasManifestFields,
} from "./utils/piece-detail/signers";
import {
	backfillFileFinalizationFromChain,
	getDocumentView,
	getValidAck,
	listConditionalAttachmentPacketsForSender,
	readEnvelopeRegistryProgress,
} from "./utils/piece-helpers";
import { getRegisterState } from "./utils/register-state";
import { loadSatelliteWorkflowSummaryForPiece } from "./utils/satellite-workflow-summary";

const {
	complianceExportLogs,
	fileComments,
	fileColdInvites,
	fileParticipants,
	fileSettlementRules,
	fileSignatures,
	files,
	focObjects,
	users,
} = db.schema;

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
			metadataJson: files.metadataJson,
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
		const pending = await getRegisterState(pieceCid);
		if (
			pending &&
			(pending.registrationStatus === "queued" ||
				pending.registrationStatus === "registering" ||
				pending.registrationStatus === "failed")
		) {
			throwAppError("FILES.REGISTRATION_PENDING");
		}
		throwAppError("FILES.NOT_FOUND");
	}

	const { participantUser, orgRead, isSender, userWalletNorm } =
		await resolvePieceDetailAccess({
			userWallet,
			participants,
			organizationId: fileRecord.organizationId,
			sender: fileRecord.sender,
		});

	const fileSignaturesRecord = await db
		.select({
			signer: fileSignatures.signer,
			timestamp: fileSignatures.createdAt,
			onchainTxHash: fileSignatures.onchainTxHash,
		})
		.from(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));

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
	const senderEmailForManifest = await resolveSenderEmailForManifest({
		sender: fileRecord.sender,
		senderParticipant,
		senderEmail,
		manifestParsed,
	});
	const senderHasAssignedFields = senderHasManifestFields({
		manifestParsed,
		senderEmailForManifest,
	});

	const coldSignerInvites = await db
		.select({
			email: fileColdInvites.email,
			emailCommitment: fileColdInvites.emailCommitment,
			claimedByWallet: fileColdInvites.claimedByWallet,
		})
		.from(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.filePieceCid, pieceCid),
				eq(fileColdInvites.isSigner, true),
				eq(fileColdInvites.status, "pending"),
			),
		);

	const signers = await buildPieceDetailSigners({
		participants,
		sender: fileRecord.sender,
		manifestParsed,
		senderEmail,
		registerRouting: fileRecord.registerRoutingJson ?? undefined,
		coldSignerInvites,
	});

	const signerEmailForRouting =
		isSender && senderEmailForManifest
			? senderEmailForManifest
			: (participantUser?.email ?? null);
	const pendingSignerReplacement =
		await readPendingSignerReplacementForPiece(pieceCid);
	const envelopeProgress = await readEnvelopeRegistryProgress({
		pieceCid,
		registryAddress: fileRecord.registryAddress as `0x${string}`,
		registerRouting: fileRecord.registerRoutingJson ?? undefined,
		signerEmail: signerEmailForRouting,
	});

	const permissions = computePieceDetailPermissions({
		participantUser,
		isSender,
		mySignature,
		senderHasAssignedFields,
		validAck,
		documentView,
		envelopeProgress,
		pendingSignerReplacement,
		orgRead,
	});

	const viewers = participants
		.filter((p) => p.role === "viewer")
		.map(rosterPerson)
		.sort((a, b) => a.wallet.localeCompare(b.wallet));

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

	const [focRow] = await db
		.select({
			lifecycle: focObjects.lifecycle,
			replicateStatus: focObjects.replicateStatus,
			retentionUntil: focObjects.retentionUntil,
			focVerifiedAt: focObjects.focVerifiedAt,
			dealId: focObjects.dealId,
		})
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	const [latestExport] = await db
		.select({
			exportKind: complianceExportLogs.exportKind,
			createdAt: complianceExportLogs.createdAt,
			documentSha256: complianceExportLogs.documentSha256,
		})
		.from(complianceExportLogs)
		.where(eq(complianceExportLogs.filePieceCid, pieceCid))
		.orderBy(desc(complianceExportLogs.createdAt))
		.limit(1);

	const senderEntitlementCtx = await resolveEntitlementContext(
		senderWallet,
		fileRecord.organizationId,
	);
	const commentsFeatureEnabled = check(
		senderEntitlementCtx,
		"features.comments",
	).allowed;

	const [senderCommentRow] = await db
		.select({ id: fileComments.id })
		.from(fileComments)
		.where(
			and(
				eq(fileComments.filePieceCid, pieceCid),
				eq(fileComments.authorWallet, senderWallet),
			),
		)
		.limit(1);

	const fieldCompletions =
		permissions.manifestUnlocked || permissions.canReadOrg
			? await listPieceFieldCompletions(pieceCid)
			: undefined;

	const satelliteWorkflowSummary =
		await loadSatelliteWorkflowSummaryForPiece(pieceCid);

	const response = buildPieceDetailResponse({
		fileRecord,
		participantUser: participantUser
			? {
					kemCiphertext: participantUser.kemCiphertext,
					encryptedEncryptionKey: participantUser.encryptedEncryptionKey,
				}
			: undefined,
		permissions,
		signers,
		viewers,
		fileSignaturesRecord,
		envelopeProgress,
		pendingSignerReplacement,
		conditionalAttachmentPackets,
		mySupplementaryPackets,
		satelliteWorkflowSummary,
		focRow,
		latestExport:
			latestExport?.documentSha256 != null &&
			(latestExport.exportKind === "zip" ||
				latestExport.exportKind === "pdf" ||
				latestExport.exportKind === "json")
				? {
						exportKind: latestExport.exportKind,
						createdAt: latestExport.createdAt,
						documentSha256: latestExport.documentSha256,
					}
				: undefined,
		commentsFeatureEnabled,
		hasSenderComments: Boolean(senderCommentRow),
		fieldCompletions,
		isSender,
	});

	return {
		...response,
		metadata:
			permissions.canReadOrg || isSender
				? fileRecord.metadataJson
					? zEnvelopeMetadata.parse(fileRecord.metadataJson)
					: null
				: undefined,
	} satisfies RpcPieceDetailOutput;
}

export async function pieceComplianceBundle(args: {
	userWallet: Address;
	pieceCid: string;
	exportKind: "zip" | "pdf" | "json";
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
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			documentSha256: files.documentSha256,
			registryAddress: files.registryAddress,
			registerRoutingJson: files.registerRoutingJson,
			completedAt: files.completedAt,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throwAppError("FILES.NOT_FOUND");
	}
	try {
		assertExportDocumentSha256Matches({
			provided: documentSha256,
			registered: fileRecord.documentSha256,
		});
	} catch (e) {
		if (e instanceof ExportDocumentSha256MismatchError) {
			throwZodBadRequest(
				new z.ZodError([
					{ code: "custom", message: e.message, path: ["documentSha256"] },
				]),
			);
		}
		throw e;
	}
	let exportAllowed = isComplianceExportAllowed(fileRecord);
	if (!exportAllowed) {
		const envelopeProgress = await readEnvelopeRegistryProgress({
			pieceCid,
			registryAddress: getAddress(fileRecord.registryAddress) as `0x${string}`,
			registerRouting: fileRecord.registerRoutingJson ?? undefined,
		});
		exportAllowed = isComplianceExportAllowed(fileRecord, envelopeProgress);
		if (exportAllowed && envelopeProgress) {
			await backfillFileFinalizationFromChain({
				pieceCid,
				file: fileRecord,
				progress: envelopeProgress,
			});
		}
	}
	if (!exportAllowed) {
		throwAppError("FILES.COMPLIANCE_EXPORT_NOT_ALLOWED");
	}

	const userWalletNorm = getAddress(args.userWallet);
	const participantUser = participants.find(
		(p) => getAddress(p.wallet) === userWalletNorm,
	);
	if (!participantUser) {
		throwAppError("FILES.FORBIDDEN");
	}

	const participantRows = participants.map((p) => ({
		wallet: getAddress(p.wallet),
		role: p.role,
		firstName: p.firstName,
		lastName: p.lastName,
		email: p.email,
		username: p.username,
		authProviderId: p.authProviderId ?? null,
	}));

	const settlementRows = await db
		.select({
			onChainRuleId: fileSettlementRules.onChainRuleId,
			validatorAddress: fileSettlementRules.validatorAddress,
		})
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.pieceCid, pieceCid));
	for (const row of settlementRows) {
		await tryCatch(
			syncSettlementPayoutFromChain(row.onChainRuleId, row.validatorAddress),
		);
	}

	const bundleRes = await tryCatch(
		buildComplianceBundleAndHash({
			db,
			pieceCid,
			participantRows,
		}),
	);
	if (bundleRes.error) {
		throwAppError("FILES.COMPLIANCE_EXPORT_FAILED", {
			cause: bundleRes.error,
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
			exportKind: args.exportKind,
			documentSha256,
			requestUserAgent: args.userAgent,
			requestIp: args.requestIp,
		}),
	);
	if (logRes.error) {
		throwAppError("FILES.COMPLIANCE_EXPORT_FAILED", {
			cause: logRes.error,
		});
	}
	const logResult = logRes.data;

	return {
		exportId: logResult.exportId,
		bundleHash: bundleResult.bundleHash,
		bundleCanonicalJson: bundleResult.bundleCanonicalJson,
		bundle: bundleResult.bundle,
	};
}
