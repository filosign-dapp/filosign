import type { ComponentProps, ReactElement } from "react";
import { Children } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import { cn } from "@/src/lib/utils/index";

type DisabledTooltipProps = {
	/** When true and `reason` is set, child is wrapped in a hoverable tooltip. */
	disabled: boolean;
	/** Shown only when `disabled` is true. Omit when enabled. */
	reason?: string | null;
	side?: ComponentProps<typeof TooltipContent>["side"];
	delay?: number;
	closeDelay?: number;
	/** Layout on the hover wrapper; default `inline-flex w-fit max-w-full`. */
	wrapperClassName?: string;
	children: ReactElement;
};

export function DisabledTooltip({
	disabled,
	reason,
	side = "right",
	delay = 0,
	closeDelay = 0,
	wrapperClassName,
	children,
}: DisabledTooltipProps) {
	const child = Children.only(children);
	const trimmedReason = reason?.trim();

	if (!disabled || !trimmedReason) {
		return child;
	}

	return (
		<Tooltip>
			<TooltipTrigger
				delay={delay}
				closeDelay={closeDelay}
				render={
					<span
						className={cn("inline-flex w-fit max-w-full", wrapperClassName)}
					/>
				}
			>
				{child}
			</TooltipTrigger>
			<TooltipContent side={side} sideOffset={16}>
				{trimmedReason}
			</TooltipContent>
		</Tooltip>
	);
}
