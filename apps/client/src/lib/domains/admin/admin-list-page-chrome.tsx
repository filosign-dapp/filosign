import { MotionReveal } from "@filosign/motion";
import type { ReactNode } from "react";
import {
	documentsPageInset,
	documentsPageToolbar,
} from "@/src/lib/domains/admin/page-layout";
import { cn } from "@/src/lib/utils";

export function AdminListPageChrome(props: {
	title: string;
	description?: string;
	actions?: ReactNode;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<MotionReveal
			className={cn(
				documentsPageToolbar,
				documentsPageInset,
				"sticky top-0 z-10 shrink-0 pt-4 pb-0",
				props.className,
			)}
			preset="smooth"
			delay={0.2}
			onlyOnce
		>
			<div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1">
					<h2 className="text-lg font-medium text-foreground">{props.title}</h2>
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
			</div>
			{props.children}
		</MotionReveal>
	);
}
