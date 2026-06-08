import { encodeListCursor } from "./cursor";

export function paginateDocumentListRows<
	T extends { updatedAt: Date; id: string },
>(rows: T[], limit: number): { items: T[]; nextCursor: string | null } {
	const hasMore = rows.length > limit;
	const page = hasMore ? rows.slice(0, limit) : rows;
	const last = page.at(-1);
	return {
		items: page,
		nextCursor:
			hasMore && last ? encodeListCursor(last.updatedAt, last.id) : null,
	};
}
