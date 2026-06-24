import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function AdminPageHeader(props: {
	title: string;
	description?: string;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<header
			className={cn(
				"flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between",
				props.className,
			)}
		>
			<div className="min-w-0 space-y-1">
				<h1 className="text-balance text-2xl font-medium tracking-tight text-foreground">
					{props.title}
				</h1>
				{props.description ? (
					<p className="text-pretty text-sm text-muted-foreground">
						{props.description}
					</p>
				) : null}
			</div>
			{props.actions ? (
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{props.actions}
				</div>
			) : null}
		</header>
	);
}
