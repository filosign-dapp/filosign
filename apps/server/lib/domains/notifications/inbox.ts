import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	zNotificationsDismissInputSchema,
	zNotificationsInboxInputSchema,
} from "@/api/orpc/schemas/notifications-input";
import {
	cacheAside,
	defaultDeserialize,
	defaultSerialize,
} from "@/lib/platform/cache/aside";
import { CACHE_TTL, cacheKeys } from "@/lib/platform/cache/keys";
import db from "@/lib/platform/db";
import type { NotificationDismissalType } from "@/lib/platform/db/schema/notifications";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { fileParticipants, fileSignatures, files, notificationDismissals } =
	db.schema;

const DEFAULT_INBOX_LIMIT = 20;
const SIGN_PAGE_PATH = "/dashboard/document/sign";

function truncateWallet(wallet: Address): string {
	const w = getAddress(wallet);
	return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

async function queryNotificationsInbox(args: {
	wallet: Address;
	limit: number;
}): Promise<{
	unreadCount: number;
	items: Array<{
		id: string;
		type: "envelope_received";
		title: string;
		subtitle: string;
		createdAt: Date;
		href: string;
	}>;
}> {
	const wallet = getAddress(args.wallet);

	const baseWhere = and(
		eq(fileParticipants.wallet, wallet),
		ne(files.sender, wallet),
		isNull(fileSignatures.signer),
		isNull(files.revokedBeforeCompletedAt),
		isNull(files.completedAt),
		sql`NOT EXISTS (
			SELECT 1 FROM ${notificationDismissals} d
			WHERE d.wallet = ${wallet}
			AND d.type = 'envelope_received'
			AND d.entity_id = ${files.pieceCid}
			AND d.dismissed_at > ${files.updatedAt}
		)`,
	);

	const [countRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(fileParticipants)
		.innerJoin(files, eq(files.pieceCid, fileParticipants.filePieceCid))
		.leftJoin(
			fileSignatures,
			and(
				eq(fileSignatures.filePieceCid, files.pieceCid),
				eq(fileSignatures.signer, wallet),
			),
		)
		.where(baseWhere);

	const rows = await db
		.select({
			pieceCid: files.pieceCid,
			displayName: files.displayName,
			sender: files.sender,
			updatedAt: files.updatedAt,
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
		.where(baseWhere)
		.orderBy(desc(files.updatedAt))
		.limit(args.limit);

	return {
		unreadCount: countRow?.count ?? 0,
		items: rows.map((row) => ({
			id: row.pieceCid,
			type: "envelope_received" as const,
			title: row.displayName?.trim() || "Untitled Document",
			subtitle: `From ${truncateWallet(row.sender)}`,
			createdAt: row.updatedAt,
			href: `${SIGN_PAGE_PATH}?pieceCid=${encodeURIComponent(row.pieceCid)}`,
		})),
	};
}

export async function notificationsInbox(args: {
	wallet: Address;
	input: unknown;
}) {
	const parsed = zNotificationsInboxInputSchema.safeParse(args.input ?? {});
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const limit = parsed.data.limit ?? DEFAULT_INBOX_LIMIT;
	const wallet = getAddress(args.wallet);

	return cacheAside({
		key: cacheKeys.notificationsInbox(wallet, limit),
		ttlSec: CACHE_TTL.notificationsInbox,
		fetch: () => queryNotificationsInbox({ wallet, limit }),
		serialize: defaultSerialize,
		deserialize: defaultDeserialize,
	});
}

export async function notificationsDismiss(args: {
	wallet: Address;
	input: unknown;
}) {
	const parsed = zNotificationsDismissInputSchema.safeParse(args.input);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const wallet = getAddress(args.wallet);
	const type: NotificationDismissalType = parsed.data.type;

	await db
		.insert(notificationDismissals)
		.values({
			wallet,
			type,
			entityId: parsed.data.id,
			dismissedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: [
				notificationDismissals.wallet,
				notificationDismissals.type,
				notificationDismissals.entityId,
			],
			set: {
				dismissedAt: new Date(),
				updatedAt: new Date(),
			},
		});

	const { invalidateNotificationsInbox } = await import(
		"@/lib/platform/cache/invalidate"
	);
	await invalidateNotificationsInbox(wallet);

	return { ok: true as const };
}
