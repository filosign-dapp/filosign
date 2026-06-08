import { SpinnerIcon } from "@phosphor-icons/react";

import { cn } from "@/src/lib/utils/index";

const sizeClasses = {
	sm: "size-4",
	md: "size-6",
	lg: "size-8",
} as const;

export type InlineLoaderProps = {
	size?: keyof typeof sizeClasses;
	className?: string;
};

export function InlineLoader({ size = "md", className }: InlineLoaderProps) {
	return (
		<span
			role="status"
			aria-live="polite"
			className={cn(
				"inline-flex items-center justify-center text-muted-foreground",
				className,
			)}
		>
			<SpinnerIcon
				className={cn("animate-spin", sizeClasses[size])}
				aria-hidden
			/>
			<span className="sr-only">Loading</span>
		</span>
	);
}
