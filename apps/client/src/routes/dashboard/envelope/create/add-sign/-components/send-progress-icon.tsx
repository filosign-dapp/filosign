"use client";

import { XCircleIcon } from "@phosphor-icons/react";
import { SendPlaneIcon } from "@/src/lib/components/app/send-plane-icon";
import { PendulumRingSpinner } from "@/src/lib/components/ui/pendulum-ring-spinner";
import { cn } from "@/src/lib/utils/index";

export function SendProgressIcon(props: { variant: "loading" | "error" }) {
	const isError = props.variant === "error";

	if (isError) {
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
				<SendPlaneIcon className="size-8" weight="fill" />
			</span>
		</PendulumRingSpinner>
	);
}
