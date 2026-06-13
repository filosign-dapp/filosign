import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

type SignInCardShellProps = {
	title: string;
	description: ReactNode;
	children?: ReactNode;
	footer?: ReactNode;
	className?: string;
};

export function SignInCardShell({
	title,
	description,
	children,
	footer,
	className,
}: SignInCardShellProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-xs",
				className,
			)}
		>
			<div className="border-b border-border pb-4 text-left">
				<p className="font-manrope font-semibold tracking-tight text-foreground">
					{title}
				</p>
				<div className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
					{description}
				</div>
			</div>
			{children}
			{footer}
		</div>
	);
}
