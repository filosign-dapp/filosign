import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function SidebarSection({
	title,
	description,
	children,
	className,
	sticky = false,
}: {
	title: ReactNode;
	description?: string;
	children: ReactNode;
	className?: string;
	sticky?: boolean;
}) {
	return (
		<section
			className={cn(
				"@container rounded-large border border-border/50 bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/5",
				sticky && "sticky top-0 z-10",
				className,
			)}
		>
			<header className="mb-3 space-y-1">
				<h3 className="font-manrope text-base font-semibold text-foreground">
					{title}
				</h3>
				{description ? (
					<p className="text-xs leading-relaxed text-muted-foreground">
						{description}
					</p>
				) : null}
			</header>
			{children}
		</section>
	);
}
