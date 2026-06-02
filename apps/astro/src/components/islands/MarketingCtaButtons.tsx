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
	primaryLabel?: string;
	secondaryHref?: string;
	secondaryLabel?: string;
	secondaryExternal?: boolean;
	showSecondary?: boolean;
	showPrimaryArrow?: boolean;
	onLinkClick?: () => void;
};

export default function MarketingCtaButtons({
	size = "lg",
	layout = "row",
	className,
	primaryHref = MARKETING_CTA.getStartedHref,
	primaryLabel = MARKETING_CTA.getStartedLabel,
	secondaryHref = MARKETING_CTA.sandboxUrl,
	secondaryLabel = MARKETING_CTA.tryFilosignLabel,
	secondaryExternal = true,
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
					{primaryLabel}
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
						href={secondaryHref}
						target={secondaryExternal ? "_blank" : undefined}
						rel={secondaryExternal ? "noopener noreferrer" : undefined}
						onClick={onLinkClick}
						className={cn(
							secondaryClass,
							"flex items-center justify-center gap-2",
							layout === "col" && "w-full min-h-11",
						)}
					>
						{secondaryLabel}
					</a>
				</Pressable>
			) : null}
		</div>
	);
}
