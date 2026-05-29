import { motion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import { MotionProvider } from "./MotionProvider";

export default function ProblemSectionIsland() {
	return (
		<MotionProvider>
			<section className="mx-auto max-w-7xl px-8 py-20 md:px-page">
				<div className="grid gap-12 lg:grid-cols-2 lg:items-center">
					<div className="space-y-5">
						<p className="font-manrope text-muted-foreground italic text-sm font-medium">
							Why Filosign?
						</p>
						<h2 className="text-3xl tracking-tight text-balance md:text-5xl">
							Agreements, approvals, and payments are split across tools.
						</h2>
						<p className="font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
							A grant, contractor form, or milestone payout rarely ends when
							someone signs. Teams still chase forms, approvals, transfers, and
							audit evidence. Filosign brings the workflow into one place.
						</p>
						<div className="space-y-4 pt-2">
							<div className="rounded-xl bg-muted/60 p-4 font-manrope text-sm">
								<span className="text-muted-foreground">Before:</span> document
								in one tool, approval in chat, payout in a wallet, evidence in a
								folder.
							</div>
							<div className="rounded-xl bg-primary p-4 font-manrope text-sm text-primary-foreground">
								After: encrypted agreement, verifiable signature record, proof
								packet, and optional USDC settlement.
							</div>
						</div>
					</div>
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="relative min-h-full overflow-hidden rounded-3xl"
					>
						<img
							src={landingMedia.problemArch}
							alt=""
							width={960}
							height={1200}
							loading="lazy"
							decoding="async"
							className="absolute inset-0 h-full w-full object-cover"
						/>
					</motion.div>
				</div>
			</section>
		</MotionProvider>
	);
}
