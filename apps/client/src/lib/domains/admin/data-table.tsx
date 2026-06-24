import type { ReactNode } from "react";
import { AdminSectionEmpty } from "@/src/lib/components/app/empty-state";
import { AdminTableSkeleton } from "@/src/lib/domains/admin/admin-table-skeleton";
import type { AdminTableStatus } from "@/src/lib/domains/admin/hooks/derive-table-status";
import { documentsTableCard } from "@/src/lib/domains/admin/page-layout";
import { cn } from "@/src/lib/utils";

export function AdminDataTable(props: {
	status: AdminTableStatus;
	errorMessage?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	isFetching?: boolean;
	children: ReactNode;
	className?: string;
}) {
	if (props.status === "loading") {
		return <AdminTableSkeleton className={props.className} />;
	}

	if (props.status === "error") {
		return (
			<p className="text-sm text-destructive">
				{props.errorMessage ?? "Could not load data."}
			</p>
		);
	}

	if (props.status === "empty") {
		return (
			<AdminSectionEmpty
				title={props.emptyTitle ?? "Nothing here yet"}
				description={props.emptyDescription}
			/>
		);
	}

	return (
		<div
			className={cn(
				documentsTableCard,
				props.isFetching && "opacity-60 transition-opacity",
				props.className,
			)}
		>
			{props.children}
		</div>
	);
}
