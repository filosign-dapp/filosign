import { keepPreviousData } from "@tanstack/react-query";

export function withAdminListPlaceholder<T extends object>(queryOptions: T) {
	return {
		...queryOptions,
		placeholderData: keepPreviousData,
	};
}
