import { MotionReveal } from "@filosign/motion";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function SignSidebarRoot({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<aside
			className={cn(
				"hidden lg:flex h-full min-h-0 w-84 shrink-0 flex-col border-l border-border bg-muted/5",
				className,
			)}
		>
			<MotionReveal
				preset="smooth"
				onlyOnce
				id="sign-sidebar"
				className="flex min-h-0 flex-1 flex-col overflow-y-auto"
			>
				<div className="flex flex-col gap-4 p-5">{children}</div>
			</MotionReveal>
		</aside>
	);
}
