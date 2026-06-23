import type { ReactNode } from "react";
import {
	placementChromeScale,
	placementChromeScaleStyle,
} from "@/src/lib/domains/files/placement-chrome-scale";

type PlacementChromeScaledProps = {
	fieldHeightPx: number;
	className?: string;
	children: ReactNode;
};

export function PlacementChromeScaled({
	fieldHeightPx,
	className,
	children,
}: PlacementChromeScaledProps) {
	const scale = placementChromeScale(fieldHeightPx);
	return (
		<div className={className ?? "h-full w-full overflow-hidden"}>
			<div
				className="relative h-full w-full"
				style={placementChromeScaleStyle(scale)}
			>
				{children}
			</div>
		</div>
	);
}
