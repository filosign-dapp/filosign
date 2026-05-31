import {
	type DocumentViewSource,
	documentViewSources,
	FILE_ACK_INTENT_VERSION_V1,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { primaryEmailForWallet } from "@/lib/domains/files/file-invites";
import {
	getValidAck,
	requireAckForParticipantAccess,
} from "@/lib/domains/files/utils/participant-access";
import { getOrgMemberWithDocumentRead } from "@/lib/domains/orgs";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import { fsFileRegistryAt } from "@/lib/platform/evm";
import { bucket } from "@/lib/platform/s3/client";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";

export { pieceComplianceBundle } from "./utils/piece-compliance";
export { pieceDetail } from "./utils/piece-detail";

const {
	files,
	fileAcknowledgements,
	fileDocumentViews,
	fileParticipants,
	fileSignerDrafts,
	users,
} = db.schema;
const zPieceAckBody = z.object({
	signature: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
	intentVersion: z.literal(FILE_ACK_INTENT_VERSION_V1).optional(),
});

export async function pieceAck(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
	requestIp?: string | null;
	requestUserAgent?: string | null;
}) {
	const parsedBody = zPieceAckBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const { signature, timestamp } = parsedBody.data;
	const intentVersion =
		parsedBody.data.intentVersion ?? FILE_ACK_INTENT_VERSION_V1;

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			registryAddress: files.registryAddress,
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
			authProviderId: users.authProviderId,
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

	const existingAck = await getValidAck(args.userWallet, args.pieceCid);
	if (existingAck) {
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
	const privySubjectCommitment = hashAuthSubjectCommitment(
		participantRecord.authProviderId,
	);

	const registry = fsFileRegistryAt(fileRecord.registryAddress);

	const valid = await registry.read.validateFileAckSignature([
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
	const acknowledgedAt = new Date(timestamp * 1000);
	const now = new Date();

	await db.insert(fileAcknowledgements).values({
		filePieceCid: fileRecord.pieceCid,
		wallet: walletNorm,
		ack: signature,
		acknowledgedAt,
		intentVersion,
		requestIp: args.requestIp ?? null,
		requestUserAgent: args.requestUserAgent ?? null,
		createdAt: acknowledgedAt,
		updatedAt: now,
	});

	trackServerEvent({
		distinctId: walletNorm,
		event: SERVER_ANALYTICS_EVENTS.pieceAcknowledged,
		pieceCid: args.pieceCid,
		properties: { intent_version: intentVersion },
	});

	return {};
}
