import { CheckIcon } from "@phosphor-icons/react";
import { PlacementChromeScaled } from "@/src/lib/domains/files/placement-chrome-scaled";
import { shouldUseCompactFieldDisplay } from "@/src/lib/domains/files/placement-field-compact";
import { PlacementFieldResizeHandle } from "@/src/lib/domains/files/placement-field-resize-handle";
import { cn } from "@/src/lib/utils";

type PlacementCheckboxFieldProps = {
	checked: boolean;
	accentColor: string;
	fieldHeightPx?: number;
	className?: string;
	showResizeHandle?: boolean;
	onResizePointerDown?: (event: React.PointerEvent) => void;
};

export function PlacementCheckboxField({
	checked,
	accentColor,
	fieldHeightPx,
	className,
	showResizeHandle = false,
	onResizePointerDown,
}: PlacementCheckboxFieldProps) {
	const shell = (
		<div className="relative h-full w-full">
			<div
				className={cn(
					"box-border flex h-full w-full items-center justify-center overflow-hidden placement-field-radius border border-placement-chrome-border bg-placement-fill-interactive shadow-md",
					className,
				)}
				style={{
					borderLeftWidth: Math.max(
						1,
						Math.min(2, (fieldHeightPx ?? 14) * 0.1),
					),
					borderLeftColor: accentColor,
				}}
			>
				{checked ? (
					<CheckIcon
						className="size-[55%] text-placement-fill-interactive-foreground"
						weight="bold"
					/>
				) : null}
			</div>
			<PlacementFieldResizeHandle
				visible={showResizeHandle}
				fieldSizePx={fieldHeightPx ?? 24}
				onPointerDown={(event) => onResizePointerDown?.(event)}
			/>
		</div>
	);

	if (
		fieldHeightPx === undefined ||
		shouldUseCompactFieldDisplay(fieldHeightPx)
	) {
		return shell;
	}

	return (
		<PlacementChromeScaled fieldHeightPx={fieldHeightPx}>
			{shell}
		</PlacementChromeScaled>
	);
}
