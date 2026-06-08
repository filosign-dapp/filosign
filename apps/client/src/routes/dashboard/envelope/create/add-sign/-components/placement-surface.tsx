import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/utils";

const placementSurfaceVariants = cva("relative w-fit", {
	variants: {
		layout: {
			strip: "bg-transparent",
			single: "border border-border bg-white shadow-lg",
		},
		placing: {
			true: "cursor-crosshair",
			false: "cursor-default",
		},
	},
	defaultVariants: {
		layout: "single",
		placing: false,
	},
});

type PlacementSurfaceProps = VariantProps<typeof placementSurfaceVariants> & {
	children: ReactNode;
	className?: string;
};

export function PlacementSurface({
	layout,
	placing,
	className,
	children,
}: PlacementSurfaceProps) {
	return (
		<div
			className={cn(placementSurfaceVariants({ layout, placing }), className)}
		>
			{children}
		</div>
	);
}
