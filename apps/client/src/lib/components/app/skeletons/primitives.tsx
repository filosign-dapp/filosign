import type * as React from "react";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { PLACEMENT_VIEWPORT_WIDTH } from "@/src/lib/domains/files/placement-viewport";
import { cn } from "@/src/lib/utils/index";

const DEFAULT_DOCUMENT_PAGE_HEIGHT = 800;

export type SkeletonTextWidth = "xs" | "sm" | "md" | "lg" | "full";

const textWidthClass: Record<SkeletonTextWidth, string> = {
	xs: "w-16",
	sm: "w-24",
	md: "w-48",
	lg: "w-64",
	full: "w-full max-w-full",
};

export function SkeletonText({
	width = "md",
	className,
}: {
	width?: SkeletonTextWidth;
	className?: string;
}) {
	return <Skeleton className={cn("h-3.5", textWidthClass[width], className)} />;
}

export function SkeletonCircle({
	size = "md",
	className,
}: {
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	const sizeClass =
		size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
	return <Skeleton className={cn("rounded-full", sizeClass, className)} />;
}

export function SkeletonButton({
	size = "default",
	className,
}: {
	size?: "sm" | "default" | "lg";
	className?: string;
}) {
	const sizeClass =
		size === "sm" ? "h-9 w-20" : size === "lg" ? "h-11 w-28" : "h-10 w-24";
	return <Skeleton className={cn("rounded-md", sizeClass, className)} />;
}

export function SkeletonTableRow({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"flex items-center gap-4 border-b border-border/60 px-4 py-3.5",
				className,
			)}
		>
			<Skeleton className="h-4 w-[38%] max-w-sm" />
			<Skeleton className="hidden h-3.5 w-20 sm:block" />
			<Skeleton className="ml-auto hidden h-6 w-16 rounded-full md:block" />
			<Skeleton className="hidden h-3.5 w-24 lg:block" />
		</div>
	);
}

export function SkeletonCard({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden rounded-lg border border-border/60",
				className,
			)}
		>
			<Skeleton className="h-32 w-full rounded-none sm:h-48" />
			<div className="flex flex-col gap-3 border-t border-border/50 px-4 py-4">
				<Skeleton className="h-5 w-24 rounded-full" />
				<div className="space-y-2">
					<SkeletonText width="lg" />
					<SkeletonText width="sm" />
				</div>
			</div>
		</div>
	);
}

export function SkeletonSection({
	titleWidth = "md",
	fieldCount = 2,
	className,
}: {
	titleWidth?: SkeletonTextWidth;
	fieldCount?: number;
	className?: string;
}) {
	return (
		<section className={cn("space-y-4", className)}>
			<SkeletonText width={titleWidth} className="h-4" />
			<div className="space-y-3">
				{Array.from({ length: fieldCount }, (_, index) => (
					<div key={index} className="space-y-2">
						<SkeletonText width="sm" className="h-3" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
				))}
			</div>
		</section>
	);
}

export function SkeletonDocumentCanvas({
	className,
	documentWidth = PLACEMENT_VIEWPORT_WIDTH,
	documentHeight = DEFAULT_DOCUMENT_PAGE_HEIGHT,
	fillContainer = false,
}: {
	className?: string;
	documentWidth?: number;
	documentHeight?: number;
	/** Fill an already-sized canvas shell (e.g. add-sign render overlay). */
	fillContainer?: boolean;
}) {
	if (fillContainer) {
		return (
			<div
				className={cn("flex h-full w-full", className)}
				role="status"
				aria-live="polite"
				aria-busy="true"
			>
				<Skeleton className="min-h-0 flex-1" />
				<span className="sr-only">Loading document</span>
			</div>
		);
	}

	const pageContentHeight = Math.max(documentHeight, 1);

	return (
		<div
			className={cn("flex h-full min-h-0 w-full flex-1 flex-col", className)}
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="flex h-full w-full flex-1 items-start justify-center overflow-hidden bg-muted/10">
					<div className="relative w-fit mt-8">
						<div
							className="relative"
							style={{
								width: documentWidth,
								minHeight: documentHeight,
							}}
						>
							<Skeleton
								className="w-full rounded-none"
								style={{ height: pageContentHeight }}
							/>
						</div>
					</div>
				</div>
			</div>
			<span className="sr-only">Loading document</span>
		</div>
	);
}

export function SkeletonStack({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <div className={cn("space-y-3", className)}>{children}</div>;
}
