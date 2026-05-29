import { motion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import { MotionProvider } from "./MotionProvider";

const useCases = [
	{
		title: "Grant milestone approvals",
		outcome: "Release funds when deliverables are signed and verified.",
		image: landingMedia.useCases.grants,
	},
	{
		title: "Contractor forms and handovers",
		outcome:
			"Close out work with proof you can export, not just email threads.",
		image: landingMedia.useCases.contractors,
	},
	{
		title: "Bounty and hackathon payouts",
		outcome:
			"Collect signatures first, then settle attached payouts when conditions are met.",
		image: landingMedia.useCases.bounties,
	},
] as const;

export default function LandingUseCasesIsland() {
	return (
		<MotionProvider>
			<section className={marketingSectionShellClass}>
				<div className="mb-10 max-w-2xl space-y-4">
					<p className="font-manrope text-sm font-medium text-primary">
						Built for high-stakes workflows
					</p>
					<h2 className="text-3xl tracking-tight md:text-5xl">
						Start where signing and payment already meet.
					</h2>
					<p className="font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
						From grants and contractor handovers to bounties — one encrypted
						workflow with optional on-chain settlement.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					{useCases.map((item, i) => (
						<motion.article
							key={item.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.08 }}
							className="group overflow-hidden rounded-2xl bg-muted"
						>
							<div className="relative aspect-4/3 min-h-48 overflow-hidden">
								<img
									src={item.image}
									alt=""
									width={800}
									height={600}
									loading="lazy"
									decoding="async"
									className="h-full w-full object-cover"
								/>
							</div>
							<div className="p-5">
								<h3 className="mb-2 font-manrope text-base font-medium">
									{item.title}
								</h3>
								<p className="font-manrope text-sm leading-relaxed text-muted-foreground">
									{item.outcome}
								</p>
							</div>
						</motion.article>
					))}
				</div>
			</section>
		</MotionProvider>
	);
}
