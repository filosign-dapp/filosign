export const ADMIN_LIST_PAGE_SIZE = 25;

export function resolveAdminListPage(page: number | undefined): number {
	return Number.isInteger(page) && (page ?? 0) >= 1 ? (page as number) : 1;
}

export function adminListOffset(page: number | undefined): {
	safePage: number;
	offset: number;
	pageSize: number;
} {
	const safePage = resolveAdminListPage(page);
	return {
		safePage,
		offset: (safePage - 1) * ADMIN_LIST_PAGE_SIZE,
		pageSize: ADMIN_LIST_PAGE_SIZE,
	};
}

export function adminListMeta(totalCount: number, safePage: number) {
	const totalPages =
		totalCount === 0 ? 0 : Math.ceil(totalCount / ADMIN_LIST_PAGE_SIZE);
	return {
		page: safePage,
		pageSize: ADMIN_LIST_PAGE_SIZE,
		totalCount,
		totalPages,
	};
}
