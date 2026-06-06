import { throwAppError } from "@filosign/errors/server";
import { zFieldCompletionInputMap, zPlacementManifest } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { primaryEmailForWallet } from "./invites";
import {
	enrichFieldCompletionMapPreviews,
	parseFieldCompletionInputMap,
} from "./utils/field-completions";
import {
	requireAckForParticipantAccess,
	resolveSignerWalletForFieldDraft,
} from "./utils/piece-helpers";

const { files, fileSignerDrafts } = db.schema;

export const zPieceSignDraftPutBody = z.object({
	completedFieldIds: z.array(z.string()),
	fieldCompletions: zFieldCompletionInputMap.optional(),
});

export async function pieceSignDraftGet(userWallet: Address, pieceCid: string) {
	const [fileRecord] = await db
		.select({
			sender: files.sender,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throwAppError("FILES.NOT_FOUND");
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerWallet = await resolveSignerWalletForFieldDraft({
		userWallet,
		pieceCid,
		sender: fileRecord.sender,
		placementManifest: manifestParsed.data,
	});

	// Sender self-sign (e.g. practice envelope): same as pieceSign / detail.canSign.
	if (getAddress(fileRecord.sender) !== getAddress(userWallet)) {
		await requireAckForParticipantAccess(userWallet, pieceCid);
	}

	const signerEmail = await primaryEmailForWallet(signerWallet);
	if (!signerEmail) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	const [draft] = await db
		.select({
			completedFieldIds: fileSignerDrafts.completedFieldIds,
			fieldCompletions: fileSignerDrafts.fieldCompletions,
		})
		.from(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, signerWallet),
			),
		);

	const stored = draft?.completedFieldIds ?? [];
	const completedFieldIds = stored.filter((id) => allowedIds.has(id));
	const fieldCompletionsRaw = draft?.fieldCompletions ?? {};
	const fieldCompletions = parseFieldCompletionInputMap(fieldCompletionsRaw);
	const filteredFieldCompletions = Object.fromEntries(
		Object.entries(fieldCompletions).filter(([id]) => allowedIds.has(id)),
	);

	return {
		completedFieldIds,
		fieldCompletions: await enrichFieldCompletionMapPreviews(
			filteredFieldCompletions,
		),
	};
}

export async function pieceSignDraftPut(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zPieceSignDraftPutBody.safeParse(args.body);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}
	const { completedFieldIds: bodyIds, fieldCompletions: bodyCompletions } =
		parsedBody.data;
	const pieceCid = args.pieceCid;
	const userWallet = args.userWallet;

	const [fileRecord] = await db
		.select({
			sender: files.sender,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throwAppError("FILES.NOT_FOUND");
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerWallet = await resolveSignerWalletForFieldDraft({
		userWallet,
		pieceCid,
		sender: fileRecord.sender,
		placementManifest: manifestParsed.data,
	});

	if (getAddress(fileRecord.sender) !== getAddress(userWallet)) {
		await requireAckForParticipantAccess(userWallet, pieceCid);
	}

	const signerEmail = await primaryEmailForWallet(signerWallet);
	if (!signerEmail) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	for (const id of bodyIds) {
		if (!allowedIds.has(id)) {
			throwZodBadRequest(
				new z.ZodError([
					{
						code: "custom",
						message: "completedFieldIds must match manifest fields for signer",
						path: ["completedFieldIds"],
					},
				]),
			);
		}
	}

	const fieldCompletions = bodyCompletions
		? parseFieldCompletionInputMap(bodyCompletions)
		: {};
	for (const id of Object.keys(fieldCompletions)) {
		if (!allowedIds.has(id)) {
			throwZodBadRequest(
				new z.ZodError([
					{
						code: "custom",
						message:
							"fieldCompletions keys must match manifest fields for signer",
						path: ["fieldCompletions"],
					},
				]),
			);
		}
	}

	const completedFieldIds = [...new Set(bodyIds)];
	const now = new Date();

	await db
		.insert(fileSignerDrafts)
		.values({
			filePieceCid: pieceCid,
			wallet: signerWallet,
			completedFieldIds,
			fieldCompletions,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [fileSignerDrafts.filePieceCid, fileSignerDrafts.wallet],
			set: {
				completedFieldIds,
				fieldCompletions,
				updatedAt: now,
			},
		});

	return {
		completedFieldIds,
		fieldCompletions: await enrichFieldCompletionMapPreviews(fieldCompletions),
	};
}
