import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/index";

type FullBleedPageHeaderProps = {
	children: ReactNode;
	className?: string;
};

/** Shared sticky header for full-bleed dashboard flows (profile, envelope, signature). */
export function FullBleedPageHeader({
	children,
	className,
}: FullBleedPageHeaderProps) {
	return (
		<header
			className={cn(
				"flex sticky top-0 z-50 justify-between items-center px-4 sm:px-6 md:px-8 h-16 border-b glass bg-background/50 border-border",
				className,
			)}
		>
			{children}
		</header>
	);
}

export function FullBleedMain({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<main
			className={cn(
				"p-4 sm:p-6 md:p-8 mx-auto w-full max-w-5xl min-h-[calc(100dvh-4rem)]",
				className,
			)}
		>
			{children}
		</main>
	);
}
