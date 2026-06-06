import { throwAppError } from "@filosign/errors/server";
import { zFieldCompletionInputMap, zPlacementManifest } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertSettlementRecipientAckProvided,
	recordSettlementRecipientAck,
} from "@/lib/domains/settlement-access/utils/recipient-ack";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { isSignerReplacementPendingOnChain } from "./signer-replacement";
import {
	parseFieldCompletionInputMap,
	validateFieldCompletionsForSigner,
} from "./utils/field-completions";
import { verifyAndRelayPieceSignature } from "./utils/sign/onchain";
import { persistPieceSignRecords } from "./utils/sign/persist";
import { runPostPieceSignSideEffects } from "./utils/sign/post-actions";
import { resolveSignerForPieceSign } from "./utils/sign/resolve-signer";
import {
	buildAssignedFieldsContext,
	computeStoredCompletionsRoot,
} from "./utils/sign/validate-fields";

const { files, fileSignerDrafts, users } = db.schema;

export const zPieceSignBody = z.object({
	signature: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
	dl3Signature: zHexString(),
	completedFieldIds: z.array(z.string()),
	fieldCompletions: zFieldCompletionInputMap.optional(),
	settlementRecipientAck: z
		.object({
			termsVersion: z.string().min(1),
			acceptedAt: z.number().int().positive(),
		})
		.optional(),
});

export async function pieceSign(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
	requestIp?: string | null;
	requestUserAgent?: string | null;
}) {
	const parsedBody = zPieceSignBody.safeParse(args.body);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}
	const {
		signature,
		timestamp,
		dl3Signature,
		completedFieldIds,
		fieldCompletions: fieldCompletionsRaw,
	} = parsedBody.data;
	const fieldCompletions = parseFieldCompletionInputMap(fieldCompletionsRaw);
	const pieceCid = args.pieceCid;

	await assertSettlementRecipientAckProvided({
		pieceCid,
		signerWallet: args.userWallet,
		body: parsedBody.data,
	});

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			completedAt: files.completedAt,
			registerRoutingJson: files.registerRoutingJson,
			isPractice: files.isPractice,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throwAppError("FILES.NOT_FOUND");
	}
	if (fileRecord.revokedBeforeCompletedAt) {
		throwAppError("FILES.ENVELOPE_VOIDED");
	}
	if (fileRecord.completedAt) {
		throwAppError("FILES.ENVELOPE_COMPLETE");
	}
	if (
		await isSignerReplacementPendingOnChain(
			fileRecord.registryAddress,
			pieceCid,
		)
	) {
		throwAppError("SIGNING.REPLACEMENT_PENDING");
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "File placement manifest missing or invalid",
		});
	}

	const userWalletNorm = getAddress(args.userWallet);
	const isSender = getAddress(fileRecord.sender) === userWalletNorm;

	const { signerWallet, authProviderId, signerEmail } =
		await resolveSignerForPieceSign({
			userWallet: args.userWallet,
			pieceCid,
			sender: fileRecord.sender,
			placementManifest: manifestParsed.data,
			isSender,
		});

	const { assignedForSigner, completedFieldIdsStored } =
		buildAssignedFieldsContext({
			manifest: manifestParsed.data,
			signerEmail,
			completedFieldIds,
		});

	validateFieldCompletionsForSigner({
		assignedFields: assignedForSigner,
		completedFieldIds: completedFieldIdsStored,
		fieldCompletions,
	});

	const completionsRoot = computeStoredCompletionsRoot({
		completedFieldIdsStored,
		placementCommitment: fileRecord.placementCommitment,
		pieceCid,
		signerWallet,
	});

	const [{ signaturePublicKey: signerDl3PubKey }] = await db
		.select({ signaturePublicKey: users.signaturePublicKey })
		.from(users)
		.where(eq(users.walletAddress, signerWallet));

	const txHash = await verifyAndRelayPieceSignature({
		pieceCid,
		sender: fileRecord.sender,
		signerWallet,
		signerEmail,
		authProviderId,
		timestamp,
		signature,
		dl3Signature,
		completionsRoot,
		signerDl3PubKey,
		registryAddress: fileRecord.registryAddress,
		placementManifest: manifestParsed.data,
		registerRoutingJson: fileRecord.registerRoutingJson,
	});

	await persistPieceSignRecords({
		pieceCid,
		signerWallet,
		signature,
		dl3Signature,
		txHash,
		completedFieldIdsStored,
		completionsRoot,
		fieldCompletions,
		timestamp,
		requestIp: args.requestIp,
		requestUserAgent: args.requestUserAgent,
	});

	const recipientAck = parsedBody.data.settlementRecipientAck;
	if (recipientAck) {
		await recordSettlementRecipientAck({
			pieceCid,
			signerWallet,
			termsVersion: recipientAck.termsVersion,
			acceptedAt: new Date(recipientAck.acceptedAt * 1000),
			requestIp: args.requestIp,
			requestUserAgent: args.requestUserAgent,
		});
	}

	await db
		.delete(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, signerWallet),
			),
		);

	await runPostPieceSignSideEffects({
		pieceCid,
		signerWallet,
		sender: getAddress(fileRecord.sender),
		organizationId: fileRecord.organizationId,
		isPractice: fileRecord.isPractice,
		registryAddress: fileRecord.registryAddress,
		registerRoutingJson: fileRecord.registerRoutingJson,
		fieldCount: completedFieldIdsStored.length,
	});

	return { txHash, signature };
}
