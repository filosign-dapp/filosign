import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "@/src/lib/utils/utils";

function ResizablePanelGroup({
	className,
	...props
}: ComponentProps<typeof Group>) {
	return <Group className={cn("flex h-full w-full", className)} {...props} />;
}

function ResizablePanel({ className, ...props }: ComponentProps<typeof Panel>) {
	return (
		<Panel className={cn("flex min-h-0 flex-col", className)} {...props} />
	);
}

function ResizableHandle({
	withHandle,
	className,
	...props
}: ComponentProps<typeof Separator> & { withHandle?: boolean }) {
	return (
		<Separator
			className={cn(
				"relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				className,
			)}
			{...props}
		>
			{withHandle ? (
				<div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
					<DotsSixVerticalIcon className="size-2.5" />
				</div>
			) : null}
		</Separator>
	);
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
