import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/index";

export function ProfileSection(props: {
	icon: ReactNode;
	title: string;
	description?: string;
	headerAside?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			className={cn(
				"overflow-hidden rounded-xl border border-border/80 bg-card/40",
				props.className,
			)}
		>
			<div className="border-b border-border/60 bg-muted/15 px-6 py-4">
				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 gap-3">
						<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground">
							{props.icon}
						</div>
						<div className="min-w-0">
							<h2 className="text-base font-medium text-foreground text-balance">
								{props.title}
							</h2>
							{props.description ? (
								<p className="mt-1 text-pretty text-sm text-muted-foreground">
									{props.description}
								</p>
							) : null}
						</div>
					</div>
					{props.headerAside ? (
						<div className="shrink-0">{props.headerAside}</div>
					) : null}
				</div>
			</div>
			<div className="p-6">{props.children}</div>
		</section>
	);
}
