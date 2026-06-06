import { CaretDownIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { cn } from "@/src/lib/utils";

export function SignSidebarCollapsibleSection({
	title,
	defaultOpen = false,
	children,
	className,
}: {
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
	className?: string;
}) {
	return (
		<Collapsible defaultOpen={defaultOpen} className={className}>
			<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/40">
				<span>{title}</span>
				<CaretDownIcon
					className={cn(
						"size-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180",
					)}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-3 pt-1 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}
