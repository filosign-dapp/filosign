import {
	LockKeyIcon,
	ShieldCheckIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { aboutMedia } from "../../config/about-media";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import { MarketingInViewStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

const badgeClass =
	"inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted px-3 py-1.5 text-sm font-medium text-secondary-foreground";

const values: {
	title: string;
	description: string;
	icon: ReactNode;
}[] = [
	{
		title: "Verify anywhere",
		description:
			"Signing should leave a record you can share and check, not a line item locked inside a vendor dashboard.",
		icon: <ShieldCheckIcon className="size-6" aria-hidden />,
	},
	{
		title: "Private by default",
		description:
			"Documents are encrypted before upload. Filosign should not need plaintext access to your agreements.",
		icon: <LockKeyIcon className="size-6" aria-hidden />,
	},
	{
		title: "Non-custodial payouts",
		description:
			"Attached payouts use exact user approvals. Filosign never holds your funds.",
		icon: <WalletIcon className="size-6" aria-hidden />,
	},
];

export default function ValuesSectionIsland() {
	return (
		<MotionProvider>
			<section className={`${marketingSectionShellClass} bg-background`}>
				<MarketingInViewStagger
					pace="page"
					className="mb-16 flex flex-col items-center gap-4 text-center"
				>
					<div className={badgeClass}>What we optimize for</div>
					<h2 className="max-w-3xl font-manrope text-3xl font-medium tracking-tight text-balance md:text-4xl lg:text-5xl">
						Agreements should stay private, verifiable, and ready to execute.
					</h2>
				</MarketingInViewStagger>

				<div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
					<MarketingInViewStagger pace="page" className="flex flex-col gap-4">
						{values.map((item) => (
							<div
								key={item.title}
								className="flex flex-1 flex-col justify-between rounded-3xl bg-muted/30 p-8"
							>
								<div className="space-y-4">
									<div className="flex size-12 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
										{item.icon}
									</div>
									<h3 className="font-manrope text-xl font-semibold">
										{item.title}
									</h3>
								</div>
								<p className="mt-6 leading-relaxed text-muted-foreground">
									{item.description}
								</p>
							</div>
						))}
					</MarketingInViewStagger>

					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="relative aspect-4/5 overflow-hidden rounded-3xl md:aspect-3/4 lg:aspect-auto lg:min-h-105"
					>
						<img
							src={aboutMedia.valuesImage}
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
