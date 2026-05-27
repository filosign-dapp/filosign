import {
	STAGGER_CONTAINER_VARIANTS,
	STAGGER_ITEM_VARIANTS,
	Stagger,
	useMotionConfig,
} from "@filosign/motion";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import {
	CONTENT_STAGGER,
	type MarketingPace,
} from "../../lib/marketing-motion";
import { MotionProvider } from "./MotionProvider";

type MarketingStaggerProps = {
	pace?: MarketingPace;
	className?: string;
	children: ReactNode;
};

/** Mount-time stagger (hero blocks). Springs via MotionConfig; faster on inner pages. */
export function MarketingStagger({
	pace = "page",
	className,
	children,
}: MarketingStaggerProps) {
	const { staggerDelay } = CONTENT_STAGGER[pace];

	return (
		<MotionProvider>
			<Stagger staggerDelay={staggerDelay} className={className}>
				{children}
			</Stagger>
		</MotionProvider>
	);
}

type MarketingInViewStaggerProps = {
	pace?: MarketingPace;
	className?: string;
	maxVisible?: number;
	children: ReactNode;
};

function MarketingInViewStaggerInner({
	pace = "page",
	className,
	maxVisible = 8,
	children,
}: MarketingInViewStaggerProps) {
	const { staggerDelay } = CONTENT_STAGGER[pace];
	const { resolveVariants } = useMotionConfig();
	const container = resolveVariants(STAGGER_CONTAINER_VARIANTS);
	const item = resolveVariants(STAGGER_ITEM_VARIANTS);
	const childCount = Array.isArray(children) ? children.length : 1;
	const shouldStagger = childCount <= maxVisible;

	return (
		<motion.div
			className={className}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: "-40px" }}
			variants={container}
			custom={shouldStagger ? staggerDelay : 0}
		>
			{shouldStagger ? (
				Array.isArray(children) ? (
					children.map((child, index) => (
						<motion.div
							key={index}
							variants={item}
							style={{ display: "contents" }}
						>
							{child}
						</motion.div>
					))
				) : (
					<motion.div variants={item} style={{ display: "contents" }}>
						{children}
					</motion.div>
				)
			) : (
				children
			)}
		</motion.div>
	);
}

/** Scroll-into-view stagger (sections below fold). */
export function MarketingInViewStagger(props: MarketingInViewStaggerProps) {
	return (
		<MotionProvider>
			<MarketingInViewStaggerInner {...props} />
		</MotionProvider>
	);
}
