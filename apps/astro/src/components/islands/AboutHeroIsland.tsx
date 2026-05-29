import { SPRING_TOKENS } from "@filosign/motion";
import { motion } from "motion/react";
import { marketingSectionClass } from "../../lib/marketing-layout";
import AboutImageMarquee from "./AboutImageMarquee";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

export default function AboutHeroIsland() {
	return (
		<MotionProvider>
			<section className="relative overflow-hidden pb-24 pt-4 sm:pt-20">
				<div className={`${marketingSectionClass} mb-16`}>
					<div className="max-w-4xl">
						<MarketingStagger
							pace="page"
							className="flex flex-col items-start text-left"
						>
							<h1 className="mb-6 font-manrope text-4xl font-medium tracking-tight text-foreground text-balance md:text-5xl lg:text-6xl">
								We build signing workflows you can trust after the ink dries.
							</h1>
							<p className="max-w-2xl font-manrope text-xl leading-relaxed text-muted-foreground text-pretty">
								Encrypted agreements, records you can verify, and optional
								payouts when everyone has signed — for teams whose deals should
								not stop at a PDF.
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
