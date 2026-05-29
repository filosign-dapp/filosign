import {
	GlobeIcon,
	HardDrivesIcon,
	InfinityIcon,
	LightningIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

function BentoCard({
	imageSrc,
	imageAlt,
	badgeIcon,
	badgeText,
	badgeBgColor,
	stat,
	subtitle,
	title,
	description,
	delay,
}: {
	imageSrc: string;
	imageAlt: string;
	badgeIcon: ReactNode;
	badgeText: string;
	badgeBgColor: string;
	stat: string | ReactNode;
	subtitle: string;
	title: string;
	description: string;
	delay: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ delay }}
			className="md:col-span-1 group"
		>
			<div className="relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-6">
				<img
					src={imageSrc}
					alt={imageAlt}
					width={400}
					height={500}
					className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>

				<div className="absolute inset-0 bg-black/30 p-8 flex flex-col justify-center items-center text-center">
					<div className="bg-white/90 backdrop-blur-sm pl-4 pr-6 py-2 rounded-full flex items-center gap-1 mb-4 shadow-sm">
						<div className={`${badgeBgColor} rounded-full p-1`}>
							{badgeIcon}
						</div>
						<span className="text-md font-manrope text-black">{badgeText}</span>
					</div>

					<div className="flex flex-col items-center justify-center">
						<div className="text-5xl mt-4 text-white drop-shadow-lg">
							{stat}
						</div>
						<div className="text-white/90 font-manrope text-sm mt-2">
							{subtitle}
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-2 px-2">
				<h3 className="text-xl font-manrope">{title}</h3>
				<p className="text-muted-foreground text-sm leading-relaxed font-manrope font-light">
					{description}
				</p>
			</div>
		</motion.div>
	);
}

export default function BentoGridIsland() {
	return (
		<section className="py-24 px-8 md:px-page max-w-7xl mx-auto">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<BentoCard
					imageSrc="/images/stock_1.webp"
					imageAlt="Legal Compliance"
					badgeIcon={<GlobeIcon className="size-5 text-black" weight="fill" />}
					badgeText="Global"
					badgeBgColor="bg-primary-light"
					stat="4"
					subtitle="Evidence pillars"
					title="Built for legal evidence"
					description="Designed to support evidence of intent, attribution, record integrity, and retention patterns used in e-signature frameworks."
					delay={0.1}
				/>

				<BentoCard
					imageSrc="/images/stock_3.webp"
					imageAlt="Perpetual Storage"
					badgeIcon={
						<HardDrivesIcon className="size-5 text-black" weight="fill" />
					}
					badgeText="Perpetual"
					badgeBgColor="bg-primary-light"
					stat={<InfinityIcon className="size-16 -my-2 text-white" />}
					subtitle="Verifiable records"
					title="Long-term proof options"
					description="Encrypted documents and proof records can use long-term verifiable storage options without exposing agreement contents."
					delay={0.2}
				/>

				<BentoCard
					imageSrc="/images/stock_5.webp"
					imageAlt="Accelerated Workflow"
					badgeIcon={
						<LightningIcon className="size-4 text-black" weight="fill" />
					}
					badgeText="Velocity"
					badgeBgColor="bg-secondary-medium"
					stat="1"
					subtitle="Workflow"
					title="Programmable Settlement"
					description="Attach non-custodial USDC payout rules so payment can settle on-chain when signing conditions are met."
					delay={0.3}
				/>
			</div>
		</section>
	);
}
