import type { ReactNode } from "react";
import {
	adminPageRoot,
	documentsPageBodyInset,
} from "@/src/lib/domains/admin/page-layout";
import { cn } from "@/src/lib/utils";

function AdminListPageRoot({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={cn(adminPageRoot, className)}>{children}</div>;
}

function AdminListPageBody({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				documentsPageBodyInset,
				"flex min-h-0 flex-1 flex-col gap-4 pt-0",
				className,
			)}
		>
			{children}
		</div>
	);
}

export const AdminListPage = Object.assign(AdminListPageRoot, {
	Body: AdminListPageBody,
});
