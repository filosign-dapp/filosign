import { Pressable, SPRING_TOKENS } from "@filosign/motion";
import { CaretRightIcon, CircleIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "../../lib/cn";

const badgeClass =
	"group/badge inline-flex h-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-primary text-primary-foreground";

const primaryLgClass =
	"group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-10 gap-1.5 px-2.5 bg-primary text-primary-foreground hover:bg-primary/80 w-full sm:w-auto";

const ghostLgClass =
	"group/button inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-10 gap-1.5 px-3 hover:bg-muted hover:text-foreground w-full sm:w-auto";

interface MarketingHeroProps {
	appUrl: string;
}

export default function MarketingHero({ appUrl }: MarketingHeroProps) {
	return (
		<section className="lg:max-w-[80dvw] mx-auto flex flex-col gap-6 md:gap-8 py-12 p-8 md:p-page">
			<motion.div
				className="flex flex-col gap-4"
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					...SPRING_TOKENS.soft,
					delay: 0.8,
				}}
			>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.soft,
						delay: 1.3,
					}}
					className="self-start group"
				>
					<span className={badgeClass}>
						<CircleIcon
							className="size-4 animate-pulse text-secondary"
							weight="fill"
						/>{" "}
						Public beta
					</span>
				</motion.div>

				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.soft,
						delay: 1.4,
					}}
					className="text-3xl sm:text-4xl md:text-5xl xl:text-7xl leading-tight"
				>
					Private agreement workflows that can settle themselves
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.soft,
						delay: 1.5,
					}}
					className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed -mt-2 font-manrope font-light"
				>
					Send encrypted documents, collect verifiable signatures, and
					optionally release USDC when signing conditions are met. Familiar
					e-signing UX, with proof and settlement built in.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.soft,
						delay: 1.6,
					}}
					className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
				>
					<Pressable preset="snappy">
						<a
							href={appUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								primaryLgClass,
								"flex items-center justify-center gap-2 group",
							)}
						>
							Try beta
							<CaretRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
						</a>
					</Pressable>

					<Pressable preset="snappy">
						<a
							href="#how-it-works"
							className={cn(
								ghostLgClass,
								"flex items-center justify-center gap-2 group",
							)}
						>
							See how it works
						</a>
					</Pressable>
				</motion.div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 40 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					type: "spring",
					stiffness: 200,
					damping: 50,
					delay: 1.5,
				}}
				className="relative flex items-center justify-center rounded-3xl mt-4 overflow-hidden group"
			>
				<div className="absolute inset-0" />

				<video
					autoPlay
					loop
					muted
					playsInline
					width={1200}
					height={600}
					className="w-full h-auto aspect-video rounded-large relative z-10 shadow-sm object-cover"
				>
					<source src="/demo.webm" type="video/webm" />
				</video>
			</motion.div>
		</section>
	);
}
