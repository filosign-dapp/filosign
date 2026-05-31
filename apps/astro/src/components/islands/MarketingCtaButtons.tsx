import { Pressable } from "@filosign/motion";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import {
	marketingGhostLgClass,
	marketingPrimaryLgClass,
	marketingPrimaryMdClass,
} from "../../lib/marketing-button";
import { MARKETING_CTA } from "../../lib/marketing-cta";
import {
	MARKETING_PRESSABLE_HOVER,
	MARKETING_PRESSABLE_TAP,
} from "../../lib/marketing-motion";

type MarketingCtaButtonsProps = {
	size?: "md" | "lg";
	layout?: "row" | "col";
	className?: string;
	primaryHref?: string;
	showSecondary?: boolean;
	showPrimaryArrow?: boolean;
	onLinkClick?: () => void;
};

export default function MarketingCtaButtons({
	size = "lg",
	layout = "row",
	className,
	primaryHref = MARKETING_CTA.getStartedHref,
	showSecondary = true,
	showPrimaryArrow = false,
	onLinkClick,
}: MarketingCtaButtonsProps) {
	const primaryClass =
		size === "lg" ? marketingPrimaryLgClass : marketingPrimaryMdClass;
	const secondaryClass = marketingGhostLgClass;

	return (
		<div
			className={cn(
				"flex items-stretch sm:items-center gap-2",
				layout === "col" ? "flex-col" : "flex-col sm:flex-row",
				className,
			)}
		>
			<Pressable
				preset="snappy"
				whileHover={MARKETING_PRESSABLE_HOVER}
				whileTap={MARKETING_PRESSABLE_TAP}
			>
				<a
					href={primaryHref}
					onClick={onLinkClick}
					className={cn(
						primaryClass,
						"flex items-center justify-center gap-2 group",
						layout === "col" && "w-full min-h-11",
					)}
				>
					{MARKETING_CTA.getStartedLabel}
					{showPrimaryArrow ? (
						<CaretRightIcon
							className="size-4 transition-transform duration-200 group-hover/button:translate-x-1"
							aria-hidden
						/>
					) : null}
				</a>
			</Pressable>

			{showSecondary ? (
				<Pressable
					preset="snappy"
					whileHover={MARKETING_PRESSABLE_HOVER}
					whileTap={MARKETING_PRESSABLE_TAP}
				>
					<a
						href={MARKETING_CTA.sandboxUrl}
						target="_blank"
						rel="noopener noreferrer"
						onClick={onLinkClick}
						className={cn(
							secondaryClass,
							"flex items-center justify-center gap-2",
							layout === "col" && "w-full min-h-11",
						)}
					>
						{MARKETING_CTA.tryFilosignLabel}
					</a>
				</Pressable>
			) : null}
		</div>
	);
}
