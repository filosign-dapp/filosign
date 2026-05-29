import {
	ChartBarIcon,
	CheckCircleIcon,
	LockKeyIcon,
	ShieldCheckIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

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
				"h-full bg-card border-none shadow-none rounded-2xl overflow-hidden p-2 md:p-4 flex flex-col",
				cardClassName ?? "",
			].join(" ")}
		>
			<div className="pb-4">
				<h3 className="text-2xl font-manrope font-light">{title}</h3>
				<p className="text-muted-foreground text-sm leading-relaxed font-manrope font-light">
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
			title: "Proof outside the vendor",
			description:
				"Proof records are designed to be independently verifiable outside Filosign, so your audit trail is not just a database row behind a vendor login.",
			body: (
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 w-full space-y-3.5 h-[192px] flex flex-col justify-center">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<ShieldCheckIcon className="size-5 text-primary" weight="fill" />
							<span className="text-sm font-medium font-manrope">
								Verifiable proof
							</span>
						</div>
						<span className="text-[10px] font-medium bg-secondary text-primary px-2.5 font-manrope py-1 rounded-full">
							Portable
						</span>
					</div>
					<div className="flex items-center justify-between opacity-40">
						<div className="flex items-center gap-3">
							<div className="size-5 rounded-full border border-foreground/30 flex items-center justify-center text-[10px] font-medium font-manrope">
								V
							</div>
							<span className="text-sm font-manrope">Vendor-only record</span>
						</div>
						<span className="text-[10px] font-medium bg-muted text-muted-foreground px-2.5 font-manrope py-1 rounded-full">
							Locked in
						</span>
					</div>
					<div className="flex items-center justify-between opacity-40 pb-1">
						<div className="flex items-center gap-3">
							<div className="size-5 rounded-full border border-foreground/30 flex items-center justify-center text-[10px] font-medium font-manrope">
								D
							</div>
							<span className="text-sm font-manrope">
								Screenshot audit trail
							</span>
						</div>
						<span className="text-[10px] font-medium bg-muted text-muted-foreground px-2.5 font-manrope py-1 rounded-full">
							Manual
						</span>
					</div>
				</div>
			),
		},
		{
			title: "Private by default",
			description:
				"Documents are encrypted in your browser before they ever leave your device. Only you and your recipients hold the keys. To us and everyone else, your files are just gibberish.",
			body: (
				<div className="bg-white p-5 rounded-2xl shadow-sm border border-border/40 w-full flex flex-col items-center h-[192px] justify-center">
					<div className="bg-white p-2 rounded-lg">
						<LockKeyIcon className="size-24 text-primary" weight="fill" />
					</div>
					<div className="w-full">
						<div className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium font-manrope text-center">
							Client-Side Encrypted
						</div>
					</div>
				</div>
			),
		},
		{
			title: "Recipient control",
			description:
				"Senders request permission before they can route documents to you. Teams get cleaner workflows and recipients avoid unsolicited signing requests.",
			body: (
				<div className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 w-full h-[192px] flex flex-col justify-center">
					<div className="space-y-2">
						<div className="flex items-center gap-4 p-3 bg-[#F2F9F0] rounded-xl relative overflow-hidden">
							<div className="size-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm font-manrope z-10">
								A
							</div>
							<div className="flex-1 z-10">
								<div className="text-sm font-semibold text-foreground font-manrope">
									Allowed Contacts
								</div>
								<div className="text-xs text-muted-foreground font-manrope">
									Can send you files
								</div>
							</div>
							<div className="size-12 rounded-full bg-primary flex items-center justify-center absolute -right-3 -bottom-3 z-0">
								<CheckCircleIcon
									className="text-white size-6 -ml-1 -mt-1"
									weight="bold"
								/>
							</div>
						</div>
						<div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/20 transition-colors opacity-60">
							<div className="size-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm font-manrope">
								S
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium font-manrope">
									Spam Senders
								</div>
								<div className="text-xs text-muted-foreground font-manrope">
									Blocked until approved
								</div>
							</div>
						</div>
					</div>
				</div>
			),
		},
	];

	return (
		<section className="py-24 px-8 md:px-page max-w-7xl mx-auto">
			<div className="text-center mb-16 space-y-4">
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-3xl md:text-5xl tracking-tight"
				>
					Your contracts working <br className="hidden md:block" />
					as hard as you do
				</motion.h2>
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.1 }}
					className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-manrope font-light"
				>
					Encrypted documents, portable proof, and optional settlement for
					agreements that should not stop at a PDF.
				</motion.p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
					className="md:col-span-3"
				>
					<div className="h-full bg-card border-none shadow-none rounded-2xl overflow-hidden p-2 md:p-4">
						<div className="grid md:grid-cols-2 gap-6 p-6 md:p-8 items-center h-full">
							<div className="flex flex-col justify-center h-full space-y-4">
								<div className="flex items-center gap-2 text-primary mb-1">
									<ChartBarIcon className="size-5" />
									<span className="font-medium text-sm font-manrope">
										Proof-ready records
									</span>
								</div>
								<h3 className="text-2xl md:text-3xl font-manrope font-light">
									Proof you can export and explain
								</h3>
								<p className="text-muted-foreground text-base leading-relaxed font-manrope font-light">
									Every completed workflow can produce a structured proof
									packet: who signed, when, what fields were completed, and
									which records back the signing event.
								</p>
							</div>

							<div className="bg-white rounded-2xl p-6 shadow-sm border border-border/40 w-full">
								<div className="flex items-center justify-between mb-6">
									<div className="flex items-center gap-3">
										<div className="size-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm font-manrope">
											S
										</div>
										<div>
											<div className="text-sm font-semibold text-foreground font-manrope">
												Sign and settle
											</div>
											<div className="text-xs text-muted-foreground font-manrope">
												Optional settlement
											</div>
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm text-muted-foreground font-medium font-manrope">
											Auto-Payout
										</div>
										<div className="text-2xl text-primary mt-1 font-manrope">
											100%
										</div>
									</div>
								</div>

								<div className="space-y-3">
									<div className="flex items-center gap-3 p-3 bg-[#F2F9F0] rounded-xl">
										<CheckCircleIcon
											className="size-5 text-primary"
											weight="bold"
										/>
										<span className="text-sm font-manrope">
											Contractor signs handover
										</span>
									</div>
									<div className="flex items-center gap-3 p-3 bg-[#F2F9F0] rounded-xl">
										<CheckCircleIcon
											className="size-5 text-primary"
											weight="bold"
										/>
										<span className="text-sm font-manrope">
											Payment can settle on-chain
										</span>
									</div>
									<div className="flex items-center gap-3 p-3 bg-[#F2F9F0] rounded-xl">
										<CheckCircleIcon
											className="size-5 text-primary"
											weight="bold"
										/>
										<span className="text-sm font-manrope">
											Less payout follow-up
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
