import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import {
	AgencyDeliveryMock,
	BountyPayoutMock,
	ContractorHandoverMock,
	FounderPrivacyMock,
	GrantMilestoneMock,
} from "../marketing-mocks";
import { MotionProvider } from "./MotionProvider";

type UseCaseCard = {
	title: string;
	outcome: string;
	mock: ReactNode;
	/** Wider card on large screens (second row). */
	wide?: boolean;
};

const useCases = [
	{
		title: "Milestone sign-offs",
		outcome:
			"Collect the approval, record who signed, and attach a payout that can release when the right people sign off.",
		mock: <GrantMilestoneMock />,
	},
	{
		title: "Contractor and vendor onboarding",
		outcome:
			"Finish agreements, intake forms, and delivery approvals without chasing separate files and payment follow-up.",
		mock: <ContractorHandoverMock />,
	},
	{
		title: "Bonus and incentive payouts",
		outcome:
			"Collect signed paperwork first, then release approved payments with a clean record finance can review.",
		mock: <BountyPayoutMock />,
	},
	{
		title: "Client deliverable handoffs",
		outcome:
			"Attach final files to the envelope and unlock them only after the client signs acceptance.",
		mock: <AgencyDeliveryMock />,
		wide: true,
	},
	{
		title: "Confidential business documents",
		outcome:
			"Share hiring, vendor, investor, and legal documents without giving the platform plaintext access to the files.",
		mock: <FounderPrivacyMock />,
		wide: true,
	},
] as const satisfies readonly UseCaseCard[];

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
						For finance, legal, operations, and client teams that need signing
						to trigger the next step, not just store a PDF.
					</p>
				</div>

				<div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-6">
					{useCases.map((item, i) => (
						<motion.article
							key={item.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.08 }}
							className={cn(
								"flex min-w-0 flex-col overflow-hidden rounded-2xl bg-muted",
								"wide" in item && item.wide
									? "md:col-span-1 lg:col-span-3"
									: "lg:col-span-2",
							)}
						>
							<div className="min-w-0 p-4">{item.mock}</div>
							<div className="flex min-w-0 flex-1 flex-col p-5 pt-0">
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
