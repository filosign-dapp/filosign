import { motion } from "motion/react";
import { aboutMedia } from "../../config/about-media";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import MarketingCtaButtons from "./MarketingCtaButtons";
import { MotionProvider } from "./MotionProvider";

export default function AboutCtaBand() {
	return (
		<MotionProvider>
			<section className={marketingSectionShellClass}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="overflow-hidden rounded-3xl border border-border/60 bg-card p-8 md:p-12"
				>
					<div className="grid gap-8 lg:grid-cols-2 lg:items-center">
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.05 }}
							className="relative aspect-4/3 overflow-hidden rounded-2xl lg:aspect-auto lg:min-h-70"
						>
							<img
								src={aboutMedia.ctaImage}
								alt=""
								width={960}
								height={720}
								loading="lazy"
								decoding="async"
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</motion.div>

						<div className="flex flex-col gap-6">
							<div className="space-y-3">
								<h2 className="text-2xl tracking-tight text-balance md:text-3xl">
									Ready to send your first agreement?
								</h2>
								<p className="font-manrope text-base leading-relaxed text-muted-foreground">
									Pick a plan or try the sandbox: encrypted signing, exportable
									records, and optional settlement when you need it.
								</p>
								<a
									href="/security"
									className="inline-block rounded-sm font-manrope text-sm font-medium text-foreground underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									Read our security overview
								</a>
							</div>

							<div className="self-start">
								<MarketingCtaButtons size="md" />
							</div>
						</div>
					</div>
				</motion.div>
			</section>
		</MotionProvider>
	);
}
