import type { IconProps } from "@phosphor-icons/react";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils/index";

type SendPlaneIconProps = Omit<IconProps, "icon"> & {
	className?: string;
};

export function SendPlaneIcon({
	className,
	weight = "bold",
	...props
}: SendPlaneIconProps) {
	return (
		<PaperPlaneTiltIcon
			className={cn(className)}
			weight={weight}
			aria-hidden
			{...props}
		/>
	);
}
