import { ShieldCheckIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import {
	marketingGhostLgClass,
	marketingPrimaryLgClass,
} from "../../lib/marketing-button";
import { MARKETING_CTA } from "../../lib/marketing-cta";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import MarketingCtaButtons from "./MarketingCtaButtons";
import MotionAwareVideo from "./MotionAwareVideo";
import { MotionProvider } from "./MotionProvider";

const trustBullets = [
	"Your documents stay private by default",
	"Export clear evidence for review",
	"Approve exact payouts from your own wallet",
	"Unlock files only after the right signatures",
	"Built from real grant and contributor workflow feedback",
] as const;

export default function TrustCtaBand() {
	return (
		<MotionProvider>
			<section className={`${marketingSectionShellClass} space-y-6`}>
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
										Trust and evidence
									</span>
								</div>
								<h2 className="text-2xl tracking-tight text-balance md:text-4xl">
									Built for teams that need privacy they can explain.
								</h2>
								<p className="font-manrope text-base leading-relaxed text-muted-foreground text-pretty">
									Filosign combines client-side encryption, exportable proof
									packets, and non-custodial payout workflows. It was built with
									feedback from the Filecoin ecosystem and ranked first overall
									in the Filecoin Onchain Cloud Alpha Cohort.
								</p>
							</div>

							<ul className="grid gap-2 font-manrope text-sm text-muted-foreground sm:grid-cols-2">
								{trustBullets.map((item) => (
									<li key={item} className="rounded-xl bg-muted/60 px-3 py-2">
										{item}
									</li>
								))}
							</ul>

							<div className="flex flex-col gap-2 sm:flex-row">
								<a
									href="/security"
									className={`${marketingPrimaryLgClass} justify-center`}
								>
									Read security notes
								</a>
								<a
									href="/legal/e-signature-validity"
									className={`${marketingGhostLgClass} justify-center`}
								>
									View legal overview
								</a>
							</div>
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 md:p-10"
				>
					<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
						<div className="max-w-3xl space-y-3">
							<p className="font-manrope text-sm font-medium text-primary">
								Ready to move the workflow
							</p>
							<h2 className="text-2xl tracking-tight text-balance md:text-4xl">
								Stop treating signatures, files, and payouts as separate
								workflows.
							</h2>
							<p className="font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
								Use Filosign when the signed agreement needs to prove what
								happened and trigger what comes next.
							</p>
						</div>
						<MarketingCtaButtons
							className="md:justify-end"
							primaryHref={MARKETING_CTA.getStartedHref}
							primaryLabel={MARKETING_CTA.getStartedLabel}
							secondaryHref={MARKETING_CTA.sandboxUrl}
							secondaryLabel={MARKETING_CTA.tryFilosignLabel}
						/>
					</div>
				</motion.div>
			</section>
		</MotionProvider>
	);
}
