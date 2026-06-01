import { ChartBarIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import {
	PrivateByDefaultMock,
	ProofOutsideMock,
	RecipientControlMock,
	SignAndSettleMock,
} from "../marketing-mocks";

function BentoCard({
	title,
	description,
	body,
	cardClassName,
}: {
	title: string;
	description: string;
	body: ReactNode;
	cardClassName?: string;
}) {
	return (
		<div
			className={[
				"@container h-full bg-card border-none shadow-none rounded-2xl overflow-hidden p-4 flex flex-col",
				cardClassName ?? "",
			].join(" ")}
		>
			<div className="pb-8">
				<h3 className="text-2xl font-manrope font-light">{title}</h3>
				<p className="text-muted-foreground text-sm leading-relaxed font-manrope mt-2 font-light">
					{description}
				</p>
			</div>
			<div className="p-6 pt-0 flex-1 flex flex-col justify-end">{body}</div>
		</div>
	);
}

export default function FeaturesBentoIsland() {
	const cards = [
		{
			title: "Verify anywhere",
			description:
				"Take the signing record with you. Anyone can check that the agreement was signed, without logging into Filosign.",
			body: <ProofOutsideMock />,
		},
		{
			title: "Private by default",
			description:
				"Files are encrypted in your browser before upload. Only you and your signers can read them. We cannot.",
			body: <PrivateByDefaultMock />,
		},
		{
			title: "You approve who can send",
			description:
				"Senders need your permission before they can route documents to you. Fewer surprise requests in your inbox.",
			body: <RecipientControlMock />,
		},
	];

	return (
		<section className={marketingSectionShellClass}>
			<div className="text-center mb-16 space-y-4">
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-3xl md:text-5xl tracking-tight"
				>
					Sign privately. Prove it later.
				</motion.h2>
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.1 }}
					className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto font-manrope font-light"
				>
					Encrypted documents, a record you can share and verify, and optional
					Attached payouts when everyone has signed.
				</motion.p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{cards.map((card, i) => (
					<motion.div
						key={card.title}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.2 + i * 0.1 }}
						className="md:col-span-1"
					>
						<BentoCard {...card} />
					</motion.div>
				))}

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.5 }}
					className="md:col-span-2 lg:col-span-3"
				>
					<div className="h-full bg-card border-none shadow-none rounded-2xl overflow-hidden p-2 md:p-4">
						<div className="grid gap-6 p-6 md:p-8 items-center h-full lg:grid-cols-2">
							<div className="flex flex-col justify-center h-full space-y-4">
								<div className="flex items-center gap-2 text-primary mb-1">
									<ChartBarIcon className="size-5" aria-hidden />
									<span className="font-medium text-sm font-manrope">
										When everyone has signed
									</span>
								</div>
								<h3 className="text-2xl md:text-3xl font-manrope font-light">
									Export a record anyone can read
								</h3>
								<p className="text-muted-foreground text-base leading-relaxed font-manrope font-light">
									Get a clear summary of who signed, when they signed, and which
									fields were completed, ready to share with finance, legal, or
									a grant reviewer.
								</p>
							</div>

							<SignAndSettleMock />
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
