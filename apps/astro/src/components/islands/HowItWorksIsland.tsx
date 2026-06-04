import { motion } from "motion/react";
import type { ReactNode } from "react";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import {
	ProofStepMock,
	SendStepMock,
	SettleStepMock,
	SignStepMock,
} from "../marketing-mocks";
import { MotionProvider } from "./MotionProvider";

const steps = [
	{
		kicker: "01",
		title: "Send the agreement",
		body: "Upload a document, add recipients, place fields, and choose who can view or sign.",
		mock: <SendStepMock />,
	},
	{
		kicker: "02",
		title: "Add what happens after signing",
		body: "Attach optional USDC payout rules or encrypted file packets that unlock only when conditions are met.",
		mock: <SignStepMock />,
	},
	{
		kicker: "03",
		title: "Collect signatures",
		body: "Recipients sign in a familiar flow while Filosign records who signed, what changed, and when it happened.",
		mock: <ProofStepMock />,
	},
	{
		kicker: "04",
		title: "Export proof or release action",
		body: "Download a proof packet, release gated files, or move an approved payout once the signing conditions are complete.",
		mock: <SettleStepMock />,
	},
] as const satisfies ReadonlyArray<{
	kicker: string;
	title: string;
	body: string;
	mock: ReactNode;
}>;

export default function HowItWorksIsland() {
	return (
		<MotionProvider>
			<section
				id="how-it-works"
				className={`${marketingSectionShellClass} scroll-mt-28`}
			>
				<div className="mb-10 md:mb-14 max-w-3xl space-y-4">
					<p className="font-manrope text-sm font-medium text-primary">
						How it works
					</p>
					<h2 className="text-3xl tracking-tight md:text-5xl">
						A familiar signing flow, with execution built in.
					</h2>
					<p className="font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
						Filosign keeps signing simple for normal users. The extra power sits
						behind the workflow: privacy, proof, payout rules, and conditional
						file access.
					</p>
				</div>

				{/* Tablet: 2-column grid */}
				<ol className="relative hidden md:grid md:grid-cols-2 md:gap-8 lg:hidden">
					{steps.map((step, i) => (
						<motion.li
							key={`tablet-${step.kicker}`}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.08 }}
							className="flex flex-col gap-4"
						>
							<span
								aria-hidden
								className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background font-manrope text-xs font-semibold text-primary"
							>
								{step.kicker}
							</span>
							<div className="space-y-2">
								<h3 className="font-manrope text-lg font-medium">
									{step.title}
								</h3>
								<p className="font-manrope text-sm leading-relaxed text-muted-foreground">
									{step.body}
								</p>
							</div>
							<div aria-hidden className="mt-auto shrink-0">
								{step.mock}
							</div>
						</motion.li>
					))}
				</ol>

				{/* Desktop: horizontal timeline */}
				<ol className="relative hidden lg:grid lg:grid-cols-4 lg:items-stretch lg:gap-6">
					{steps.map((step, i) => (
						<motion.li
							key={step.kicker}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.08 }}
							className="relative flex h-full flex-col gap-4"
						>
							<div className="relative z-10 flex items-center">
								<span
									aria-hidden
									className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background font-manrope text-xs font-semibold text-primary"
								>
									{step.kicker}
								</span>
								{i < steps.length - 1 ? (
									<span
										aria-hidden
										className="pointer-events-none absolute top-1/2 left-5 hidden h-px w-[calc(100%+1.5rem)] max-w-[calc(100%+1.5rem)] -translate-y-1/2 bg-border lg:block"
									/>
								) : null}
							</div>
							<div className="min-h-0 flex-1 space-y-2">
								<h3 className="font-manrope text-lg font-medium">
									{step.title}
								</h3>
								<p className="font-manrope text-sm leading-relaxed text-muted-foreground">
									{step.body}
								</p>
							</div>
							<div aria-hidden className="mt-auto shrink-0">
								{step.mock}
							</div>
						</motion.li>
					))}
				</ol>

				{/* Mobile: vertical timeline rail */}
				<ol className="flex flex-col gap-10 border-l-2 border-border pl-6 md:hidden">
					{steps.map((step, i) => (
						<motion.li
							key={step.kicker}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: i * 0.08 }}
							className="relative space-y-4"
						>
							<span
								aria-hidden
								className="absolute -left-11.25 top-0 flex size-10 items-center justify-center rounded-full border border-border bg-background font-manrope text-xs font-semibold text-primary"
							>
								{step.kicker}
							</span>
							<div className="space-y-2 pt-1">
								<h3 className="font-manrope text-lg font-medium">
									{step.title}
								</h3>
								<p className="font-manrope text-sm leading-relaxed text-muted-foreground">
									{step.body}
								</p>
							</div>
							<div aria-hidden>{step.mock}</div>
						</motion.li>
					))}
				</ol>
			</section>
		</MotionProvider>
	);
}
