import { SPRING_TOKENS } from "@filosign/motion";
import { motion } from "motion/react";
import { marketingSectionClass } from "../../lib/marketing-layout";
import AboutImageMarquee from "./AboutImageMarquee";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

export default function AboutHeroIsland() {
	return (
		<MotionProvider>
			<section className="relative overflow-hidden py-12 md:py-20">
				<div className={`${marketingSectionClass} mb-16`}>
					<div className="max-w-3xl">
						<MarketingStagger
							pace="page"
							className="flex flex-col items-start text-left"
						>
							<h1 className="mb-6 font-manrope text-4xl font-medium tracking-tight text-foreground text-balance md:text-5xl lg:text-6xl">
								We build agreements that keep working after they are signed.
							</h1>
							<p className="max-w-3xl font-manrope text-xl leading-relaxed text-muted-foreground text-pretty">
								Filosign gives sensitive workflows one place to sign, prove,
								release files, and attach approved payouts, without making teams
								juggle PDFs, folders, chats, and payment tools.
							</p>
						</MarketingStagger>
					</div>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.snappy,
						delay: 0.35,
					}}
					className="relative w-full"
				>
					<AboutImageMarquee />
				</motion.div>
			</section>
		</MotionProvider>
	);
}
