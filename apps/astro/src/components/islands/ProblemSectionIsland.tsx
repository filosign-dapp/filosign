import { motion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import { MotionProvider } from "./MotionProvider";

export default function ProblemSectionIsland() {
	return (
		<MotionProvider>
			<section className={marketingSectionShellClass}>
				<div className="grid gap-12 lg:grid-cols-2 lg:items-center">
					<div className="space-y-5">
						<p className="font-manrope text-muted-foreground italic text-sm font-medium">
							Why Filosign?
						</p>
						<h2 className="text-3xl tracking-tight text-balance md:text-5xl">
							The signature is rarely the end of the workflow.
						</h2>
						<p className="font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
							A grant, contractor handoff, bounty, or sensitive approval does
							not stop when someone signs. Teams still chase payment details,
							send files manually, take screenshots for proof, and rebuild the
							audit trail later. Filosign keeps the agreement, proof, payout,
							and file handoff in one private workflow.
						</p>
						<div className="space-y-4 pt-2">
							<div className="rounded-xl bg-muted/60 p-4 font-manrope text-sm">
								<span className="text-muted-foreground">Before:</span> one tool
								for signing, chat for approval, spreadsheets for tracking,
								wallets for payout, folders for evidence.
							</div>
							<div className="rounded-xl bg-primary p-4 font-manrope text-sm text-primary-foreground">
								After: one encrypted agreement workflow with signatures, proof
								packets, optional USDC payouts, and gated file release.
							</div>
						</div>
					</div>
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="relative aspect-4/5 overflow-hidden rounded-3xl sm:aspect-3/4 lg:aspect-auto lg:min-h-120"
					>
						<img
							src={landingMedia.problemArch}
							alt=""
							width={960}
							height={1200}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover"
						/>
					</motion.div>
				</div>
			</section>
		</MotionProvider>
	);
}
