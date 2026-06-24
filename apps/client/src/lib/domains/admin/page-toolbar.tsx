import type { ReactNode } from "react";
import { documentsPageInset } from "@/src/lib/domains/admin/page-layout";
import { cn } from "@/src/lib/utils";

export function AdminPageToolbar(props: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"sticky top-0 z-10 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-sm",
				documentsPageInset,
				"py-3",
				props.className,
			)}
		>
			{props.children}
		</div>
	);
}
