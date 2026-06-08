import { Image } from "@/src/lib/components/app/media/image";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import { cn } from "@/src/lib/utils";

export const PRO_FEATURE_ICON_SRC = "/logo_icon.webp";

type Props = {
	className?: string;
	size?: "xs" | "sm";
	tooltip?: string;
};

const sizePx = { xs: 12, sm: 14 } as const;
const sizeClass = { xs: "size-3", sm: "size-3.5" } as const;

export function ProFeatureMark({
	className,
	size = "sm",
	tooltip = "Pro Feature",
}: Props) {
	return (
		<Tooltip>
			<TooltipTrigger
				delay={0}
				closeDelay={0}
				render={<span className={cn("inline-flex shrink-0", className)} />}
			>
				<Image
					src={PRO_FEATURE_ICON_SRC}
					alt=""
					width={sizePx[size]}
					height={sizePx[size]}
					className={cn("rounded-sm", sizeClass[size])}
				/>
			</TooltipTrigger>
			<TooltipContent side="right">{tooltip}</TooltipContent>
		</Tooltip>
	);
}
