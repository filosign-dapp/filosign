import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/index";

export function SettingsSection(props: {
	icon: ReactNode;
	title: ReactNode;
	description?: ReactNode;
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

export function SettingsSyncNotice(props: { title: string; body: string }) {
	return (
		<div
			role="status"
			aria-live="polite"
			className="flex gap-3 rounded-lg border border-sky-500/25 bg-sky-500/8 px-4 py-3 text-sm"
		>
			<span
				className="mt-1.5 size-2 shrink-0 animate-pulse rounded-full bg-sky-500 motion-reduce:animate-none"
				aria-hidden="true"
			/>
			<div className="min-w-0">
				<p className="font-medium text-foreground">{props.title}</p>
				<p className="mt-0.5 text-pretty text-muted-foreground">{props.body}</p>
			</div>
		</div>
	);
}
