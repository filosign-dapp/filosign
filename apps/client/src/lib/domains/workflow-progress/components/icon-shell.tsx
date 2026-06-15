"use client";

import { XCircleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { PendulumRingSpinner } from "@/src/lib/components/ui/pendulum-ring-spinner";
import { cn } from "@/src/lib/utils/index";

export function WorkflowProgressIconShell(props: {
	variant: "loading" | "error";
	children: ReactNode;
}) {
	if (props.variant === "error") {
		return (
			<div className="relative flex size-24 items-center justify-center">
				<span className="relative flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20">
					<XCircleIcon className="size-8" weight="fill" aria-hidden />
				</span>
			</div>
		);
	}

	return (
		<PendulumRingSpinner size="md" className="text-primary">
			<span
				className={cn(
					"flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20",
				)}
			>
				{props.children}
			</span>
		</PendulumRingSpinner>
	);
}
