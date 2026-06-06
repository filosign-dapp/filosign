import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../../lib/cn";

const FAQ_ITEMS = [
	{
		id: "solo-handoffs",
		question: "I'm solo but need payouts or gated files. Which plan?",
		answer:
			"Solo includes gated file packets and basic USDC payout packets. After subscribing, request payout attachment access in Workspace settings. Filosign approves access separately from your plan tier.",
	},
	{
		id: "no-team-features",
		question: "I don't want team collaboration features.",
		answer:
			"Stay on Solo for handoffs without shared templates, comments, or team envelope visibility. If you need per-packet recipient selection or pooled quota without colleagues, Teams at one seat is supported.",
	},
	{
		id: "teams-pro-worth-it",
		question: "When is Teams Pro worth it over Teams?",
		answer:
			"Choose Teams Pro when you need sequential signing order, quorum (minimum signatures), multi-recipient payout rules, or signature-conditional file release. Higher document and signer limits are included too.",
	},
	{
		id: "payout-approval",
		question: "Do payout packets work immediately after checkout?",
		answer:
			"Your plan unlocks the feature, but USDC payout packets also require workspace payout access approval and wallet setup. See the payout access guide in Filosign docs.",
	},
	{
		id: "document-quota",
		question: "What counts toward my document limit?",
		answer:
			"Each envelope you send counts once. Drafts and review links do not count until the envelope is sent. Free includes 3 documents lifetime. Paid Solo limits reset each calendar month. Teams and Teams Pro limits are pooled across the workspace and reset monthly.",
	},
	{
		id: "pooled-quota",
		question: "How does pooled quota work on Teams plans?",
		answer:
			"Team plans multiply documents per seat by your seat count and share that pool across everyone in the workspace. For example, Teams with four seats gets 60 documents per month (15 × 4). Add seats at checkout or later in Workspace settings → Billing.",
	},
	{
		id: "change-plan",
		question: "Can I change plans, seats, or billing later?",
		answer:
			"Yes. In Workspace settings → Billing you can switch between Teams and Teams Pro, add or remove seats, and open the billing portal to update payment or cancel. Yearly billing saves 15% versus paying month to month on the list price.",
	},
] as const;

function FaqItem({
	id,
	question,
	answer,
	open,
	onToggle,
}: {
	id: string;
	question: string;
	answer: string;
	open: boolean;
	onToggle: () => void;
}) {
	const panelId = `pricing-faq-${id}`;

	return (
		<div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
			<button
				type="button"
				id={`${panelId}-trigger`}
				aria-expanded={open}
				aria-controls={panelId}
				onClick={onToggle}
				className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-left font-manrope font-medium"
			>
				<span className="text-sm md:text-base">{question}</span>
				<CaretDownIcon
					className={cn(
						"size-5 shrink-0 text-muted-foreground transition-transform duration-200",
						open && "rotate-180",
					)}
					aria-hidden
				/>
			</button>
			{open ? (
				<div
					id={panelId}
					role="region"
					aria-labelledby={`${panelId}-trigger`}
					className="border-t border-border/40 px-4 pb-4 pt-1"
				>
					<p className="text-sm leading-relaxed text-muted-foreground font-manrope">
						{answer}
					</p>
				</div>
			) : null}
		</div>
	);
}

export default function PricingFaqIsland() {
	const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

	return (
		<section className="space-y-4 min-w-0" aria-labelledby="pricing-faq">
			<div className="space-y-2 text-center lg:text-left">
				<h2
					id="pricing-faq"
					className="text-xl font-medium font-manrope text-foreground md:text-2xl"
				>
					Common questions
				</h2>
				<p className="text-sm text-muted-foreground font-manrope">
					Trials, quotas, plan changes, and choosing Solo vs Teams
				</p>
			</div>
			<div className="space-y-3">
				{FAQ_ITEMS.map((item) => (
					<FaqItem
						key={item.id}
						id={item.id}
						question={item.question}
						answer={item.answer}
						open={openId === item.id}
						onToggle={() =>
							setOpenId((current) => (current === item.id ? null : item.id))
						}
					/>
				))}
			</div>
		</section>
	);
}
