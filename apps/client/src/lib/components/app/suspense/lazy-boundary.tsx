import type { ReactNode } from "react";
import { Suspense } from "react";
import { ViewerChromeSkeleton } from "@/src/lib/components/app/skeletons";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { cn } from "@/src/lib/utils/index";

type LazyBoundaryProps = {
	children: ReactNode;
	/** Override default fallback entirely */
	fallback?: ReactNode;
	fallbackClassName?: string;
	minHeight?: string;
	loaderSize?: "sm" | "md" | "lg";
	/** Layout-aware skeleton when the surrounding chrome is already visible */
	skeleton?: ReactNode;
};

const defaultFallbackClass =
	"flex items-center justify-center bg-background min-h-60";

/**
 * Standard Suspense shell for lazy chunks (PDF.js, heavy dialogs).
 * Prefer route `pendingComponent` for loader-driven navigation - not query Suspense.
 */
export function LazyBoundary({
	children,
	fallback,
	fallbackClassName,
	minHeight = "min-h-60",
	loaderSize = "md",
	skeleton,
}: LazyBoundaryProps) {
	const resolvedFallback =
		fallback ??
		(skeleton ? (
			skeleton
		) : (
			<div className={cn(defaultFallbackClass, minHeight, fallbackClassName)}>
				<InlineLoader size={loaderSize} />
			</div>
		));

	return <Suspense fallback={resolvedFallback}>{children}</Suspense>;
}

export function LazyViewerFallback() {
	return <ViewerChromeSkeleton />;
}
