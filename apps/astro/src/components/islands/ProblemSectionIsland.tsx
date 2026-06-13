import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { landingMedia } from "../../config/landing-media";
import { cn } from "../../lib/cn";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import { MotionProvider } from "./MotionProvider";

const beforeItems = [
	"E-sign for the signature",
	"Chat and spreadsheets for follow-up",
	"Payment and proof handled separately",
] as const;

const afterItems = [
	"Sign, release payment, and unlock files together",
	"Proof packet ready when the deal closes",
	"One private workflow from send to handoff",
] as const;

type CompareSideProps = {
	variant: "before" | "after";
	label: string;
	items: readonly string[];
};

function CompareSide({ variant, label, items }: CompareSideProps) {
	const isAfter = variant === "after";

	return (
		<div
			className={cn(
				"flex flex-col gap-3 p-4 sm:p-5",
				isAfter ? "bg-primary text-primary-foreground" : "bg-muted/50",
			)}
		>
			<p
				className={cn(
					"font-manrope text-xs font-semibold uppercase tracking-wide",
					isAfter ? "text-primary-foreground/75" : "text-muted-foreground",
				)}
			>
				{label}
			</p>
			<ul className="space-y-2">
				{items.map((item) => (
					<li
						key={item}
						className="flex items-start gap-2.5 font-manrope text-sm leading-snug"
					>
						{isAfter ? (
							<CheckCircleIcon
								className="mt-0.5 size-3.5 shrink-0 text-secondary"
								weight="fill"
								aria-hidden
							/>
						) : (
							<XCircleIcon
								className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
								weight="bold"
								aria-hidden
							/>
						)}
						<span>{item}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function WorkflowComparePanel() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ delay: 0.08 }}
			className="overflow-hidden rounded-2xl border border-border/80"
		>
			<div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
				<CompareSide variant="before" label="Before" items={beforeItems} />
				<CompareSide variant="after" label="After" items={afterItems} />
			</div>
		</motion.div>
	);
}

export default function ProblemSectionIsland() {
	return (
		<MotionProvider>
			<section className={marketingSectionShellClass}>
				<div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-30">
					<div className="flex flex-col gap-5">
						<p className="font-manrope text-sm font-medium text-primary">
							Why Filosign?
						</p>
						<h2 className="text-3xl tracking-tight text-balance md:text-5xl">
							The signature is rarely the end of the workflow.
						</h2>
						<p className="font-manrope text-base leading-relaxed text-muted-foreground md:text-lg">
							A milestone approval, vendor handoff, or client acceptance does
							not stop when someone signs. Teams still chase payment details,
							send files manually, and rebuild the audit trail later.
						</p>
						<WorkflowComparePanel />
					</div>
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="relative aspect-4/5 overflow-hidden rounded-3xl sm:aspect-3/4 lg:aspect-4/5 lg:max-h-none"
					>
						<img
							src={landingMedia.problemArch}
							alt=""
							width={760}
							height={950}
							sizes="(min-width: 1024px) 50vw, 100vw"
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
