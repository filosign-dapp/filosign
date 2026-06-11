import { CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils";

type PlacementCheckboxFieldProps = {
	checked: boolean;
	accentColor: string;
	className?: string;
};

export function PlacementCheckboxField({
	checked,
	accentColor,
	className,
}: PlacementCheckboxFieldProps) {
	return (
		<div
			className={cn(
				"box-border flex h-full w-full items-center justify-center overflow-hidden rounded-sm border border-placement-chrome-border bg-placement-fill-interactive shadow-md",
				className,
			)}
			style={{
				borderLeftWidth: 3,
				borderLeftColor: accentColor,
			}}
		>
			{checked ? (
				<CheckIcon
					className="size-[55%] min-h-3 min-w-3 text-placement-fill-interactive-foreground"
					weight="bold"
				/>
			) : null}
		</div>
	);
}
