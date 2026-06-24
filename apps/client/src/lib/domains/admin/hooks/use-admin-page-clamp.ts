import type { NavigateOptions } from "@tanstack/react-router";
import { useEffect } from "react";

export function useAdminPageClamp(args: {
	page: number;
	totalPages: number | undefined;
	navigate: (options: NavigateOptions) => void | Promise<void>;
}) {
	useEffect(() => {
		const totalPages = args.totalPages;
		if (totalPages === undefined || totalPages === 0) return;
		if (args.page > totalPages) {
			void args.navigate({
				search: (prev: Record<string, unknown>) => ({
					...prev,
					page: totalPages,
				}),
				replace: true,
			});
		}
	}, [args.page, args.totalPages, args.navigate]);
}
