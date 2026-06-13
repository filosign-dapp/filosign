import type * as React from "react";
import {
	SkeletonCard,
	SkeletonTableRow,
} from "@/src/lib/components/app/skeletons/primitives";
import { cn } from "@/src/lib/utils/index";

export type ListPageSkeletonProps = {
	toolbar?: React.ReactNode;
	rowCount?: number;
	variant?: "table" | "cards";
	className?: string;
};

export function ListPageSkeleton({
	toolbar,
	rowCount = 6,
	variant = "table",
	className,
}: ListPageSkeletonProps) {
	return (
		<div
			className={cn("flex min-h-0 flex-1 flex-col", className)}
			aria-busy="true"
			aria-live="polite"
			role="status"
		>
			{toolbar ? <div className="shrink-0">{toolbar}</div> : null}
			{variant === "cards" ? (
				<div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: rowCount }, (_, index) => (
						<SkeletonCard key={index} />
					))}
				</div>
			) : (
				<div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/60 bg-card">
					{Array.from({ length: rowCount }, (_, index) => (
						<SkeletonTableRow key={index} />
					))}
				</div>
			)}
			<span className="sr-only">Loading content</span>
		</div>
	);
}
