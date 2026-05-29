import { Pressable, SPRING_TOKENS } from "@filosign/motion";
import { CaretRightIcon, CircleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import { cn } from "../../lib/cn";
import {
	marketingGhostLgClass,
	marketingPrimaryLgClass,
} from "../../lib/marketing-button";
import { marketingHeroSectionClass } from "../../lib/marketing-layout";
import {
	MARKETING_PRESSABLE_HOVER,
	MARKETING_PRESSABLE_TAP,
} from "../../lib/marketing-motion";
import MotionAwareVideo from "./MotionAwareVideo";
import { MotionProvider } from "./MotionProvider";

const badgeClass =
	"group/badge inline-flex h-fit max-w-full shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium text-balance bg-primary text-primary-foreground";

interface MarketingHeroProps {
	appUrl: string;
}

export default function MarketingHero({ appUrl }: MarketingHeroProps) {
	const reducedMotion = useReducedMotion();
	const introDelay = reducedMotion ? 0 : 0.8;
	const itemDelay = reducedMotion ? 0 : 1.3;

	return (
		<MotionProvider>
			<section
				className={cn(
					marketingHeroSectionClass,
					"flex flex-col gap-6 md:gap-8",
				)}
			>
				<motion.div
					className="flex flex-col gap-4"
					initial={reducedMotion ? false : { opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.soft,
						delay: introDelay,
					}}
				>
					<motion.div
						initial={reducedMotion ? false : { opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							...SPRING_TOKENS.soft,
							delay: itemDelay,
						}}
						className="self-start group"
					>
						<span className={badgeClass}>
							<CircleIcon
								className="size-4 animate-pulse text-secondary"
								weight="fill"
								aria-hidden
							/>{" "}
							Public beta
						</span>
					</motion.div>

					<motion.h1
						initial={reducedMotion ? false : { opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							...SPRING_TOKENS.soft,
							delay: itemDelay + 0.1,
						}}
						className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight text-balance max-w-full"
					>
						Private agreement workflows that can settle themselves
					</motion.h1>

					<motion.p
						initial={reducedMotion ? false : { opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							...SPRING_TOKENS.soft,
							delay: itemDelay + 0.2,
						}}
						className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed -mt-2 font-manrope font-light text-pretty"
					>
						Send encrypted documents, collect verifiable signatures, and attach
						payouts on signing conditions.
					</motion.p>

					<motion.div
						initial={reducedMotion ? false : { opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							...SPRING_TOKENS.soft,
							delay: itemDelay + 0.3,
						}}
						className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
					>
						<Pressable
							preset="snappy"
							whileHover={MARKETING_PRESSABLE_HOVER}
							whileTap={MARKETING_PRESSABLE_TAP}
						>
							<a
								href={appUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									marketingPrimaryLgClass,
									"flex items-center justify-center gap-2 group",
								)}
							>
								Start free
								<CaretRightIcon
									className="w-4 h-4 transition-transform duration-200 group-hover/button:translate-x-1"
									aria-hidden
								/>
							</a>
						</Pressable>

						<Pressable
							preset="snappy"
							whileHover={MARKETING_PRESSABLE_HOVER}
							whileTap={MARKETING_PRESSABLE_TAP}
						>
							<a
								href="/pricing"
								className={cn(
									marketingGhostLgClass,
									"flex items-center justify-center gap-2 group",
								)}
							>
								See pricing
							</a>
						</Pressable>
					</motion.div>
				</motion.div>

				<motion.div
					initial={reducedMotion ? false : { opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 50,
						delay: reducedMotion ? 0 : 1.5,
					}}
					className="relative flex items-center justify-center rounded-3xl mt-4 overflow-hidden"
				>
					<MotionAwareVideo
						width={1200}
						height={600}
						className="w-full h-auto aspect-video rounded-large relative z-10 shadow-sm object-cover"
					>
						<source src={landingMedia.demoVideo} type="video/webm" />
					</MotionAwareVideo>
				</motion.div>
			</section>
		</MotionProvider>
	);
}
