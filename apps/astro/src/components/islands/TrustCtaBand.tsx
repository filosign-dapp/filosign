import { ShieldCheckIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import MarketingCtaButtons from "./MarketingCtaButtons";
import MotionAwareVideo from "./MotionAwareVideo";
import { MotionProvider } from "./MotionProvider";

export default function TrustCtaBand() {
	return (
		<MotionProvider>
			<section className={marketingSectionShellClass}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 md:p-12"
				>
					<div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.05 }}
							className="relative aspect-4/3 overflow-hidden rounded-2xl lg:aspect-auto lg:min-h-full"
						>
							<MotionAwareVideo
								width={960}
								height={720}
								preload="auto"
								className="absolute inset-0 h-full w-full object-cover"
							>
								<source
									src={landingMedia.trustBackgroundVideo}
									type="video/webm"
								/>
							</MotionAwareVideo>
						</motion.div>

						<div className="flex flex-col gap-6">
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-primary">
									<ShieldCheckIcon
										className="size-5"
										weight="fill"
										aria-hidden
									/>
									<span className="font-manrope text-sm font-medium">
										Trust and compliance
									</span>
								</div>
								<h2 className="text-2xl tracking-tight text-balance md:text-4xl">
									Encrypted workflows with evidence you can explain.
								</h2>
								<p className="font-manrope text-base leading-relaxed text-muted-foreground text-pretty">
									Client-side encryption, exportable proof packets, and payout
									attachment docs for security and legal review.
								</p>
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
