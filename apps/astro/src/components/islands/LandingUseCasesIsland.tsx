import { motion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import { MotionProvider } from "./MotionProvider";

const useCases = [
	{
		title: "Grant milestone approvals",
		outcome:
			"Collect the milestone form, verify the signer, and attach a payout packet that can release when the right people sign.",
		image: landingMedia.useCases.grants,
	},
	{
		title: "Contractor forms and handovers",
		outcome:
			"Finish agreements, tax forms, delivery approvals, and final handoffs without chasing separate files and payment follow-up.",
		image: landingMedia.useCases.contractors,
	},
	{
		title: "Bounty and hackathon payouts",
		outcome:
			"Collect winner paperwork first, then settle approved payouts with a clean record for finance and community review.",
		image: landingMedia.useCases.bounties,
	},
	{
		title: "Agency and dev studio delivery",
		outcome:
			"Attach source code, design assets, or final files to the envelope and unlock them only after sign-off conditions are met.",
		image: landingMedia.useCases.contractors,
	},
	{
		title: "Sensitive founder workflows",
		outcome:
			"Share investor, hiring, vendor, and IP documents without giving the platform plaintext access to the files.",
		image: landingMedia.useCases.grants,
	},
] as const;

export default function LandingUseCasesIsland() {
	return (
		<MotionProvider>
			<section className={marketingSectionShellClass}>
				<div className="mb-10 md:mb-14 max-w-3xl space-y-4">
					<p className="font-manrope text-sm font-medium text-primary">
						Built for workflows with consequences
					</p>
					<h2 className="text-3xl tracking-tight md:text-5xl">
						Use Filosign when a signed agreement should trigger action.
					</h2>
					<p className="font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
						Start with the teams that already feel the pain: grants,
						contributors, contractors, agencies, and operators handling
						sensitive work across borders.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
