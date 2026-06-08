import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/utils";

const documentSurfaceVariants = cva("relative w-fit", {
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

type DocumentSurfaceProps = VariantProps<typeof documentSurfaceVariants> & {
	children: ReactNode;
	className?: string;
};

export function DocumentSurface({
	layout,
	placing,
	className,
	children,
}: DocumentSurfaceProps) {
	return (
		<div
			className={cn(documentSurfaceVariants({ layout, placing }), className)}
		>
			{children}
		</div>
	);
}

export { documentSurfaceVariants };
