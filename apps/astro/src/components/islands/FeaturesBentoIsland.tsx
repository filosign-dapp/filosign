import { CurrencyDollarIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import {
	GatedDeliverableMock,
	PrivateByDefaultMock,
	SignAndSettleMock,
	SigningConditionsMock,
} from "../marketing-mocks";

function BentoCard({
	title,
	description,
	docsHref,
	body,
	cardClassName,
}: {
	title: string;
	description: string;
	docsHref?: string;
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
				{docsHref ? (
					<a
						href={docsHref}
						className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline font-manrope"
					>
						Learn more in the docs
					</a>
				) : null}
			</div>
			<div className="p-6 pt-0 flex-1 flex flex-col justify-end">{body}</div>
		</div>
	);
}

export default function FeaturesBentoIsland() {
	const cards = [
		{
			title: "Private documents",
			description:
				"Files are encrypted in your browser before upload. Filosign does not receive the plaintext document in normal operation.",
			docsHref: "/docs/security/encrypted-workflows",
			body: <PrivateByDefaultMock />,
		},
		{
			title: "Gated deliverable release",
			description:
				"Attach final files to the envelope. Recipients get them only after acceptance is signed.",
			docsHref: "/docs/workflows/attached-files",
			body: <GatedDeliverableMock />,
		},
		{
			title: "Flexible signing conditions",
			description:
				"Release payment or files when the right people sign, not only when everyone on the envelope is done.",
			docsHref: "/docs/workflows/release-conditions",
			body: <SigningConditionsMock />,
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
					Private by design. Useful after the signature.
				</motion.h2>
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.1 }}
					className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto font-manrope font-light"
				>
					Most signing tools stop at the signed PDF. Filosign is built for what
					comes next: private documents, controlled release, and payments that
					move only when your conditions are met.
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
								<div className="flex items-center gap-1 text-primary mb-2">
									<CurrencyDollarIcon className="size-5" aria-hidden />
									<span className="font-medium text-sm font-manrope">
										When conditions are met
									</span>
								</div>
								<h3 className="text-2xl md:text-3xl font-manrope font-light">
									Payments tied to signatures
								</h3>
								<p className="text-muted-foreground text-base leading-relaxed font-manrope font-light">
									Attach an approved payout to an agreement so payment follow-up
									moves automatically once signing conditions are satisfied.
									Filosign does not hold your funds.
								</p>
								<a
									href="/docs/workflows/payouts"
									className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline font-manrope"
								>
									Learn about payout packets
								</a>
							</div>

							<SignAndSettleMock />
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
