import {
	SPRING_TOKENS,
	STAGGER_ITEM_VARIANTS,
	useMotionConfig,
} from "@filosign/motion";
import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import {
	heroBottomStartSec,
	type MarketingPace,
	navIntroEndSec,
	PAGE_SEQUENCE,
	pageBodyStartSec,
} from "../../lib/marketing-motion";
import { MotionProvider } from "./MotionProvider";

function pageStaggerItemVariants(pace: MarketingPace): Variants {
	const spring = PAGE_SEQUENCE[pace].heroItemSpring;
	return {
		hidden: { opacity: 0, y: 22 },
		visible: {
			opacity: 1,
			y: 0,
			transition: spring,
		},
	};
}

type MarketingHeroTopProps = {
	pace?: MarketingPace;
	className?: string;
	children: ReactNode;
};

/** Phase 2 - staggered hero copy after nav intro (snappy on inner pages). */
export function MarketingHeroTop({
	pace = "page",
	className,
	children,
}: MarketingHeroTopProps) {
	const { resolveVariants } = useMotionConfig();
	const seq = PAGE_SEQUENCE[pace];
	const startDelay = navIntroEndSec(pace);
	const itemVariants = resolveVariants(pageStaggerItemVariants(pace));

	return (
		<motion.div
			className={className}
			initial="hidden"
			animate="visible"
			variants={{
				hidden: { opacity: 0 },
				visible: {
					opacity: 1,
					transition: {
						delayChildren: startDelay,
						staggerChildren: seq.heroStagger,
					},
				},
			}}
		>
			{Array.isArray(children) ? (
				children.map((child, index) => (
					<motion.div
						key={index}
						variants={itemVariants}
						style={{ display: "contents" }}
					>
						{child}
					</motion.div>
				))
			) : (
				<motion.div variants={itemVariants} style={{ display: "contents" }}>
					{children}
				</motion.div>
			)}
		</motion.div>
	);
}

type MarketingHeroBottomProps = {
	pace?: MarketingPace;
	topChildCount: number;
	className?: string;
	children: ReactNode;
	/** Slight scale-in for media blocks. */
	variant?: "rise" | "scale";
};

/** Phase 2b - hero media / visual block after copy stagger. */
export function MarketingHeroBottom({
	pace = "page",
	topChildCount,
	className,
	children,
	variant = "rise",
}: MarketingHeroBottomProps) {
	const seq = PAGE_SEQUENCE[pace];
	const delay = heroBottomStartSec(pace, topChildCount);

	const hidden =
		variant === "scale"
			? { opacity: 0, y: seq.bottomHiddenY, scale: 0.94 }
			: { opacity: 0, y: seq.bottomHiddenY };

	const visible =
		variant === "scale" ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0 };

	return (
		<motion.div
			className={className}
			initial={hidden}
			animate={visible}
			transition={{
				...seq.bottomSpring,
				delay,
			}}
		>
			{children}
		</motion.div>
	);
}

type MarketingPageBodyProps = {
	pace?: MarketingPace;
	heroTopChildCount: number;
	heroBottomChildCount?: number;
	className?: string;
	children: ReactNode;
	maxVisible?: number;
};

/** Phase 3 - main content below hero (pricing cards, changelog list, etc.). */
export function MarketingPageBody({
	pace = "page",
	heroTopChildCount,
	heroBottomChildCount = 1,
	className,
	children,
	maxVisible = 24,
}: MarketingPageBodyProps) {
	const { resolveVariants } = useMotionConfig();
	const seq = PAGE_SEQUENCE[pace];
	const startDelay = pageBodyStartSec(
		pace,
		heroTopChildCount,
		heroBottomChildCount,
	);
	const item = resolveVariants(STAGGER_ITEM_VARIANTS);
	const childCount = Array.isArray(children) ? children.length : 1;
	const shouldStagger = childCount <= maxVisible;

	return (
		<motion.div
			className={className}
			initial="hidden"
			animate="visible"
			variants={{
				hidden: { opacity: 0 },
				visible: {
					opacity: 1,
					transition: {
						delayChildren: startDelay,
						staggerChildren: shouldStagger ? seq.bottomStagger : 0,
					},
				},
			}}
		>
			{shouldStagger && Array.isArray(children)
				? children.map((child, index) => (
						<motion.div
							key={index}
							variants={item}
							style={{ display: "contents" }}
						>
							{child}
						</motion.div>
					))
				: children}
		</motion.div>
	);
}

type MarketingHeroDecorProps = {
	pace?: MarketingPace;
	topChildCount: number;
	className?: string;
	children: ReactNode;
};

/** Ambient decor - fades in with hero bottom timing. */
export function MarketingHeroDecor({
	pace = "page",
	topChildCount,
	className,
	children,
}: MarketingHeroDecorProps) {
	const delay = heroBottomStartSec(pace, topChildCount);

	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, scale: 0.92 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{
				...SPRING_TOKENS.glide,
				delay,
			}}
		>
			{children}
		</motion.div>
	);
}

type MarketingPageShellProps = {
	children: ReactNode;
};

export function MarketingPageShell({ children }: MarketingPageShellProps) {
	return <MotionProvider>{children}</MotionProvider>;
}
