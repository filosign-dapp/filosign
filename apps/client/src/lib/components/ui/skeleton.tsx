import type * as React from "react";
import { cn } from "@/src/lib/utils/index";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn(
				"relative overflow-hidden rounded-md bg-muted",
				"before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-foreground/6 before:to-transparent motion-reduce:before:animate-none",
				className,
			)}
			{...props}
		/>
	);
}

export { Skeleton };
