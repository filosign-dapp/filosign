import { throwAppError } from "@filosign/errors/server";
import { and, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import type { z } from "zod";
import { zDocumentsListInputSchema } from "@/api/orpc/schemas/documents-input";
import type { zDocumentListRowSchema } from "@/api/orpc/schemas/documents-output";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import { assertOrgPermission } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { decodeListCursor, encodeListCursor } from "./utils/cursor";
import {
	draftDocumentSizeBytesSelect,
	mapDraftListRow,
} from "./utils/draft-row";
import { mapEnvelopeListRow } from "./utils/envelope-row";
import { paginateDocumentListRows } from "./utils/paginate";
import { titleIlike } from "./utils/search";

const { envelopeDrafts, fileParticipants, fileSignatures, files, users } =
	db.schema;

type DocumentListRow = z.infer<typeof zDocumentListRowSchema>;

const DEFAULT_LIMIT = 50;

function resolveLimit(limit: number | undefined): number {
	return limit ?? DEFAULT_LIMIT;
}

function cursorWhere(cursor: ReturnType<typeof decodeListCursor>) {
	if (!cursor) return undefined;
	const updatedAt = new Date(cursor.u);
	return or(
		lt(files.updatedAt, updatedAt),
		and(eq(files.updatedAt, updatedAt), lt(files.pieceCid, cursor.i)),
	);
}

function draftCursorWhere(cursor: ReturnType<typeof decodeListCursor>) {
	if (!cursor) return undefined;
	const updatedAt = new Date(cursor.u);
	return or(
		lt(envelopeDrafts.updatedAt, updatedAt),
		and(
			eq(envelopeDrafts.updatedAt, updatedAt),
			lt(envelopeDrafts.id, cursor.i),
		),
	);
}

function envelopeSigningSelect() {
	return {
		signerSlotCount: files.signerSlotCount,
		signedCount: sql<number>`(
			SELECT count(*)::int FROM ${fileSignatures}
			WHERE ${fileSignatures.filePieceCid} = ${files.pieceCid}
		)`,
	};
}

function envelopeSenderProfileSelect() {
	return {
		senderFirstName: users.firstName,
		senderLastName: users.lastName,
		senderEmail: users.email,
		senderUsername: users.username,
	};
}

type EnvelopeQueryRow = {
	pieceCid: string;
	displayName: string | null;
	sender: Address;
	completedAt: Date | null;
	revokedBeforeCompletedAt: Date | null;
	updatedAt: Date;
	ciphertextByteLength: number | null;
	metadataJson: unknown;
	signedByMe: boolean;
	signerSlotCount: number;
	signedCount: number;
	senderFirstName?: string | null;
	senderLastName?: string | null;
	senderEmail?: string | null;
	senderUsername?: string | null;
};

function mapEnvelopeQueryRow(row: EnvelopeQueryRow, wallet: Address) {
	return mapEnvelopeListRow({
		pieceCid: row.pieceCid,
		displayName: row.displayName,
		sender: row.sender,
		wallet,
		completedAt: row.completedAt,
		revokedBeforeCompletedAt: row.revokedBeforeCompletedAt,
		updatedAt: row.updatedAt,
		ciphertextByteLength: row.ciphertextByteLength,
		signedByMe: row.signedByMe,
		metadataJson: row.metadataJson,
		signerSlotCount: row.signerSlotCount,
		signedCount: row.signedCount,
		senderProfile:
			row.senderFirstName !== undefined
				? {
						firstName: row.senderFirstName,
						lastName: row.senderLastName ?? null,
						email: row.senderEmail ?? null,
						username: row.senderUsername ?? null,
					}
				: undefined,
	});
}

function paginateEnvelopeRows(
	rows: EnvelopeQueryRow[],
	wallet: Address,
	limit: number,
) {
	const pageRows = rows.map((row) => ({
		updatedAt: row.updatedAt,
		id: row.pieceCid,
		row: mapEnvelopeQueryRow(row, wallet),
	}));
	const { items, nextCursor } = paginateDocumentListRows(pageRows, limit);
	return {
		items: items.map((x) => x.row),
		nextCursor,
	};
}

async function listSentEnvelopes(args: {
	wallet: Address;
	limit: number;
	cursor: ReturnType<typeof decodeListCursor>;
	q?: string;
}): Promise<{ items: DocumentListRow[]; nextCursor: string | null }> {
	const wallet = getAddress(args.wallet);
	const fetchLimit = args.limit + 1;
	const cursorFilter = cursorWhere(args.cursor);
	const titleFilter = titleIlike(files.displayName, args.q);

	const rows = await db
		.select({
			pieceCid: files.pieceCid,
			displayName: files.displayName,
			sender: files.sender,
			completedAt: files.completedAt,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			updatedAt: files.updatedAt,
			ciphertextByteLength: files.ciphertextByteLength,
			metadataJson: files.metadataJson,
			signedByMe: sql<boolean>`EXISTS (
				SELECT 1 FROM ${fileSignatures}
				WHERE ${fileSignatures.filePieceCid} = ${files.pieceCid}
				AND ${fileSignatures.signer} = ${wallet}
			)`,
			...envelopeSigningSelect(),
		})
		.from(files)
		.where(and(eq(files.sender, wallet), cursorFilter, titleFilter))
		.orderBy(desc(files.updatedAt), desc(files.pieceCid))
		.limit(fetchLimit);

	return paginateEnvelopeRows(rows, wallet, args.limit);
}

async function listReceivedEnvelopes(args: {
	wallet: Address;
	limit: number;
	cursor: ReturnType<typeof decodeListCursor>;
	q?: string;
}): Promise<{ items: DocumentListRow[]; nextCursor: string | null }> {
	const wallet = getAddress(args.wallet);
	const fetchLimit = args.limit + 1;
	const cursorFilter = cursorWhere(args.cursor);
	const titleFilter = titleIlike(files.displayName, args.q);

	const rows = await db
		.select({
			pieceCid: files.pieceCid,
			displayName: files.displayName,
			sender: files.sender,
			completedAt: files.completedAt,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			updatedAt: files.updatedAt,
			ciphertextByteLength: files.ciphertextByteLength,
			metadataJson: files.metadataJson,
			signedByMe: sql<boolean>`${fileSignatures.signer} IS NOT NULL`,
			...envelopeSigningSelect(),
			...envelopeSenderProfileSelect(),
		})
		.from(fileParticipants)
		.innerJoin(files, eq(files.pieceCid, fileParticipants.filePieceCid))
		.leftJoin(
			fileSignatures,
			and(
				eq(fileSignatures.filePieceCid, files.pieceCid),
				eq(fileSignatures.signer, wallet),
			),
		)
		.leftJoin(users, eq(users.walletAddress, files.sender))
		.where(
			and(
				eq(fileParticipants.wallet, wallet),
				ne(files.sender, wallet),
				cursorFilter,
				titleFilter,
			),
		)
		.orderBy(desc(files.updatedAt), desc(files.pieceCid))
		.limit(fetchLimit);

	return paginateEnvelopeRows(rows, wallet, args.limit);
}

async function listDraftRows(args: {
	organizationId: string;
	limit: number;
	cursor: ReturnType<typeof decodeListCursor>;
	q?: string;
}): Promise<{ items: DocumentListRow[]; nextCursor: string | null }> {
	const fetchLimit = args.limit + 1;
	const cursorFilter = draftCursorWhere(args.cursor);
	const titleFilter = titleIlike(envelopeDrafts.title, args.q);

	const rows = await db
		.select({
			id: envelopeDrafts.id,
			title: envelopeDrafts.title,
			updatedAt: envelopeDrafts.updatedAt,
			createdByWallet: envelopeDrafts.createdByWallet,
			...draftDocumentSizeBytesSelect(),
		})
		.from(envelopeDrafts)
		.where(
			and(
				eq(envelopeDrafts.organizationId, args.organizationId),
				eq(envelopeDrafts.status, "active"),
				cursorFilter,
				titleFilter,
			),
		)
		.orderBy(desc(envelopeDrafts.updatedAt), desc(envelopeDrafts.id))
		.limit(fetchLimit);

	const mapped: DocumentListRow[] = rows.map((row) => mapDraftListRow(row));

	const { items, nextCursor } = paginateDocumentListRows(
		mapped.map((row) => ({
			updatedAt: new Date(row.updatedAt),
			id: row.id,
			row,
		})),
		args.limit,
	);
	return { items: items.map((x) => x.row), nextCursor };
}

type CombinedSortRow = {
	updatedAt: Date;
	id: string;
	row: DocumentListRow;
};

async function listAllRows(args: {
	wallet: Address;
	organizationId: string | null;
	limit: number;
	cursor: ReturnType<typeof decodeListCursor>;
	q?: string;
}): Promise<{ items: DocumentListRow[]; nextCursor: string | null }> {
	const wallet = getAddress(args.wallet);
	const fetchLimit = args.limit + 1;

	const envelopeRows = await listVisibleEnvelopes({
		wallet,
		organizationId: args.organizationId,
		q: args.q,
	});

	const draftTitleFilter = titleIlike(envelopeDrafts.title, args.q);
	const draftRows = args.organizationId
		? await db
				.select({
					id: envelopeDrafts.id,
					title: envelopeDrafts.title,
					updatedAt: envelopeDrafts.updatedAt,
					createdByWallet: envelopeDrafts.createdByWallet,
					...draftDocumentSizeBytesSelect(),
				})
				.from(envelopeDrafts)
				.where(
					and(
						eq(envelopeDrafts.organizationId, args.organizationId),
						eq(envelopeDrafts.status, "active"),
						draftTitleFilter,
					),
				)
		: [];

	const combined: CombinedSortRow[] = [
		...envelopeRows.map((row) => ({
			updatedAt: row.updatedAt,
			id: row.pieceCid,
			row: mapEnvelopeQueryRow(row, wallet),
		})),
		...draftRows.map((row) => ({
			updatedAt: row.updatedAt,
			id: row.id,
			row: mapDraftListRow(row),
		})),
	];

	combined.sort((a, b) => {
		const t = b.updatedAt.getTime() - a.updatedAt.getTime();
		if (t !== 0) return t;
		return b.id.localeCompare(a.id);
	});

	let filtered = combined;
	if (args.cursor) {
		const cursor = args.cursor;
		const cursorUpdatedAt = new Date(cursor.u);
		filtered = combined.filter((entry) => {
			if (entry.updatedAt < cursorUpdatedAt) return true;
			if (entry.updatedAt > cursorUpdatedAt) return false;
			return entry.id < cursor.i;
		});
	}

	const page = filtered.slice(0, fetchLimit);
	const hasMore = page.length > args.limit;
	const items = hasMore ? page.slice(0, args.limit) : page;
	const last = items.at(-1);

	return {
		items: items.map((x) => x.row),
		nextCursor:
			hasMore && last ? encodeListCursor(last.updatedAt, last.id) : null,
	};
}

async function listVisibleEnvelopes(args: {
	wallet: Address;
	organizationId: string | null;
	q?: string;
}): Promise<EnvelopeQueryRow[]> {
	const wallet = getAddress(args.wallet);
	const orgId = args.organizationId?.trim();
	const pieceCidSet = new Set<string>();

	if (orgId) {
		const orgRows = await db
			.select({ pieceCid: files.pieceCid })
			.from(files)
			.where(eq(files.organizationId, orgId));
		for (const row of orgRows) pieceCidSet.add(row.pieceCid);
	}

	const sentRows = await db
		.select({ pieceCid: files.pieceCid })
		.from(files)
		.where(eq(files.sender, wallet));
	for (const row of sentRows) pieceCidSet.add(row.pieceCid);

	const participantRows = await db
		.select({ pieceCid: fileParticipants.filePieceCid })
		.from(fileParticipants)
		.where(eq(fileParticipants.wallet, wallet));
	for (const row of participantRows) pieceCidSet.add(row.pieceCid);

	const pieceCids = [...pieceCidSet];
	if (pieceCids.length === 0) return [];

	const titleFilter = titleIlike(files.displayName, args.q);

	return db
		.select({
			pieceCid: files.pieceCid,
			displayName: files.displayName,
			sender: files.sender,
			completedAt: files.completedAt,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			updatedAt: files.updatedAt,
			ciphertextByteLength: files.ciphertextByteLength,
			metadataJson: files.metadataJson,
			signedByMe: sql<boolean>`EXISTS (
				SELECT 1 FROM ${fileSignatures}
				WHERE ${fileSignatures.filePieceCid} = ${files.pieceCid}
				AND ${fileSignatures.signer} = ${wallet}
			)`,
			...envelopeSigningSelect(),
			...envelopeSenderProfileSelect(),
		})
		.from(files)
		.leftJoin(users, eq(users.walletAddress, files.sender))
		.where(and(inArray(files.pieceCid, pieceCids), titleFilter));
}

export async function documentsList(args: {
	wallet: Address;
	activeOrg: ActiveOrgContext | null;
	input: unknown;
}): Promise<{ items: DocumentListRow[]; nextCursor: string | null }> {
	const parsed = zDocumentsListInputSchema.safeParse(args.input ?? {});
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const tab = parsed.data.tab ?? "all";
	const limit = resolveLimit(parsed.data.limit);
	const cursor = decodeListCursor(parsed.data.cursor);
	const q = parsed.data.q;

	if (tab === "drafts") {
		if (!args.activeOrg) {
			throwAppError("WORKSPACE.ORG_CONTEXT_REQUIRED");
		}
		assertOrgPermission(args.activeOrg, "drafts:read");
		return listDraftRows({
			organizationId: args.activeOrg.organizationId,
			limit,
			cursor,
			q,
		});
	}

	if (tab === "sent") {
		return listSentEnvelopes({ wallet: args.wallet, limit, cursor, q });
	}

	if (tab === "received") {
		return listReceivedEnvelopes({ wallet: args.wallet, limit, cursor, q });
	}

	if (tab === "all") {
		if (args.activeOrg) {
			assertOrgPermission(args.activeOrg, "drafts:read");
		}
		return listAllRows({
			wallet: args.wallet,
			organizationId: args.activeOrg?.organizationId ?? null,
			limit,
			cursor,
			q,
		});
	}

	throwAppError("FILES.NOT_FOUND");
}
