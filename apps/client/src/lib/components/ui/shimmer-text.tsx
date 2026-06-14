import type * as React from "react";
import { cn } from "@/src/lib/utils/index";

type ShimmerTextProps = React.ComponentProps<"span"> & {
	active?: boolean;
};

/**
 * Gradient highlight swept across glyph shapes via background-clip: text.
 * Falls back to inherited color when inactive or without clip support.
 */
export function ShimmerText({
	className,
	active = true,
	children,
	...props
}: ShimmerTextProps) {
	return (
		<span
			className={cn(
				className,
				active &&
					"supports-[background-clip:text]:animate-text-shimmer supports-[background-clip:text]:bg-size-[200%_100%] supports-[background-clip:text]:bg-clip-text supports-[background-clip:text]:text-transparent supports-[background-clip:text]:[-webkit-background-clip:text] supports-[background-clip:text]:[-webkit-text-fill-color:transparent] supports-[background-clip:text]:motion-reduce:animate-none supports-[background-clip:text]:bg-linear-to-r supports-[background-clip:text]:from-foreground/45 supports-[background-clip:text]:via-foreground supports-[background-clip:text]:to-foreground/45",
			)}
			{...props}
		>
			{children}
		</span>
	);
}
