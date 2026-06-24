import { throwAppError } from "@filosign/errors/server";
import {
	computePlacementCommitment,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	hashOrgIdCommitment,
	normalizePlacementRecipientEmail,
	uniqueSignerEmailsFromManifest,
	usesAdvancedRegisterRouting,
	validateSignerSignatureFieldsForSend,
	zPlacementManifest,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { MAX_FILE_SIZE } from "@/constants";
import {
	assertEntitlement,
	recipientSlotCounts,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import { shouldEnforceSendQuota } from "@/lib/domains/users";
import db from "@/lib/platform/db";
import type { FileRegistrationStatus } from "@/lib/platform/db/schema/file";
import { fsContracts } from "@/lib/platform/evm";
import { routeRelayerForNewPiece } from "@/lib/platform/evm/relayer-pool";
import { enqueueFileRegister } from "@/lib/platform/jobs";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { normalizedViewerEmailsForRegister } from "./invites";
import { zFileRegisterBody } from "./utils/register-body";
import {
	findRegisteredFileByPieceCid,
	resolveRegisterRoutingCalldata,
} from "./utils/register-helpers";
import {
	getRegisterState,
	readRegistrationStatusSnapshot,
	upsertQueuedState,
} from "./utils/register-state";

/** Call-time schema access so Bun `mock.module("@/lib/platform/db")` stays effective across the shared test module cache. */
function schema() {
	return db.schema;
}

const { FSEnvelopeRegistry } = fsContracts;

export {
	zFileRegisterBody,
	zFileRegistrationStatusBody,
} from "./utils/register-body";

export type FilesRegisterResult = {
	registrationStatus: FileRegistrationStatus;
};

export type FilesRegistrationStatusResult = {
	registrationStatus: FileRegistrationStatus;
	registerError: string | null;
	onchainTxHash: `0x${string}` | null;
};

export async function filesRegistrationStatus(
	pieceCid: string,
): Promise<FilesRegistrationStatusResult> {
	const snapshot = await readRegistrationStatusSnapshot(pieceCid);
	if (!snapshot) {
		throwAppError("FILES.NOT_FOUND");
	}
	return snapshot;
}

export async function filesRegister(
	sender: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsedBody = zFileRegisterBody.safeParse(rawBody);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}

	const { pieceCid } = parsedBody.data;

	const existing = await findRegisteredFileByPieceCid(pieceCid);
	if (existing) {
		return { registrationStatus: "registered" as const };
	}

	const pending = await getRegisterState(pieceCid);
	if (
		pending &&
		(pending.registrationStatus === "queued" ||
			pending.registrationStatus === "registering")
	) {
		return { registrationStatus: pending.registrationStatus };
	}

	const {
		participants,
		signature,
		timestamp,
		placementCommitment,
		documentSha256,
		placementManifest: placementManifestRaw,
		coldInvites = [],
		organizationId,
		routing,
		isPractice = false,
	} = parsedBody.data;

	assertOrgPermission(activeOrg, "documents:send");
	if (organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}

	const orgIdCommitment = hashOrgIdCommitment(organizationId);

	const parsedManifest = zPlacementManifest.safeParse(placementManifestRaw);
	if (!parsedManifest.success) {
		throwZodBadRequest(parsedManifest.error);
	}
	const placementManifest = parsedManifest.data;
	const signatureFieldError = validateSignerSignatureFieldsForSend(
		placementManifest,
		uniqueSignerEmailsFromManifest(placementManifest),
	);
	if (signatureFieldError) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: signatureFieldError,
					path: ["placementManifest", "fields"],
				},
			]),
		);
	}
	const derivedCommitment = computePlacementCommitment(placementManifest);
	if (derivedCommitment.toLowerCase() !== placementCommitment.toLowerCase()) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "placementCommitment does not match manifest",
					path: ["placementCommitment"],
				},
			]),
		);
	}
	if (documentSha256 === `0x${"0".repeat(64)}`) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "documentSha256 must be non-zero",
					path: ["documentSha256"],
				},
			]),
		);
	}
	const viewerEmails = await normalizedViewerEmailsForRegister({
		participants,
		coldInvites,
	});
	const {
		viewerEmailCommitmentsSorted,
		routingRequiredCommitments,
		optionalCommitmentsSorted,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
	} = resolveRegisterRoutingCalldata({
		placementManifest,
		routing,
		viewerEmails,
	});

	const [senderUser] = await db
		.select({
			email: schema().users.email,
			authProviderId: schema().users.authProviderId,
		})
		.from(schema().users)
		.where(eq(schema().users.walletAddress, getAddress(sender)));

	if (!senderUser) {
		throwAppError("AUTH.UNAUTHORIZED");
	}

	const senderEmailRaw = senderUser.email?.trim();
	if (!senderEmailRaw) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}
	const senderEmailCommitment = hashNormalizedSignerEmail(
		normalizePlacementRecipientEmail(senderEmailRaw),
	);
	const senderAuthSubjectCommitment = hashAuthSubjectCommitment(
		senderUser.authProviderId,
	);

	const valid = await tryCatch(
		FSEnvelopeRegistry.read.validateEnvelopeRegistrationSignature([
			{
				pieceCid,
				sender,
				requiredCommitments: routingRequiredCommitments,
				optionalCommitments: optionalCommitmentsSorted,
				viewerEmailCommitments: viewerEmailCommitmentsSorted,
				senderEmailCommitment,
				senderAuthSubjectCommitment,
				orgIdCommitment,
				routingMode,
				routingOrder,
				quorumN,
				quorumSet,
				timestamp: BigInt(timestamp),
				signature,
				placementCommitment,
				documentSha256,
			},
		]),
	);

	if (valid.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: `Error validating signature ${valid.error}`,
		});
	}
	if (!valid.data) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
	}

	const fileExists = await bucket.exists(`uploads/${pieceCid}`);
	if (!fileExists) {
		throwAppError("FILES.UPLOAD_MISSING");
	}

	const file = bucket.file(`uploads/${pieceCid}`);
	if (file.size > MAX_FILE_SIZE) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "File exceeds maximum allowed size",
					path: ["file"],
				},
			]),
		);
	}

	if (file.size === 0) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Uploaded file is empty",
					path: ["file"],
				},
			]),
		);
	}

	const slotCounts = recipientSlotCounts({ participants, coldInvites });
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(sender),
		organizationId ?? null,
	);
	if (shouldEnforceSendQuota(isPractice)) {
		assertEntitlement(entitlementCtx, "documents.sent.monthly");
	}
	assertEntitlement(entitlementCtx, "envelope.recipients.max", {
		requested: slotCounts.recipientSlotCount,
	});
	if (usesAdvancedRegisterRouting(routing)) {
		assertEntitlement(entitlementCtx, "features.routing.advanced");
	}

	const retryPayload = {
		sender: getAddress(sender),
		rawBody: parsedBody.data,
		activeOrg,
	};

	const relayer = routeRelayerForNewPiece(pieceCid);

	await upsertQueuedState({
		pieceCid,
		sender,
		payload: retryPayload,
		assignedRelayerAddress: relayer.address,
	});

	await enqueueFileRegister(pieceCid);

	return { registrationStatus: "queued" as const };
}
