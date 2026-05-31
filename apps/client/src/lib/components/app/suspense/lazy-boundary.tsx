import type { ReactNode } from "react";
import { Suspense } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { cn } from "@/src/lib/utils/index";

type LazyBoundaryProps = {
	children: ReactNode;
	/** Override default centered InlineLoader fallback */
	fallback?: ReactNode;
	fallbackClassName?: string;
	minHeight?: string;
	loaderSize?: "sm" | "md" | "lg";
};

const defaultFallbackClass =
	"flex items-center justify-center bg-white min-h-[240px]";

/**
 * Standard Suspense shell for lazy chunks (PDF.js, heavy dialogs).
 * Prefer route `pendingComponent` for loader-driven navigation - not query Suspense.
 */
export function LazyBoundary({
	children,
	fallback,
	fallbackClassName,
	minHeight = "min-h-[240px]",
	loaderSize = "md",
}: LazyBoundaryProps) {
	const resolvedFallback = fallback ?? (
		<div className={cn(defaultFallbackClass, minHeight, fallbackClassName)}>
			<InlineLoader size={loaderSize} />
		</div>
	);

	return <Suspense fallback={resolvedFallback}>{children}</Suspense>;
}
