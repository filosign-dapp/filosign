import {
	AnimatePresence,
	motion,
	Pressable,
	SPRING_TOKENS,
} from "@filosign/motion";
import { CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { FilosignRpcProvider } from "../../lib/filosign-rpc";
import {
	marketingGhostLgClass,
	marketingPrimaryMdClass,
} from "../../lib/marketing-button";
import { MARKETING_CTA } from "../../lib/marketing-cta";
import { marketingSectionClass } from "../../lib/marketing-layout";
import {
	MARKETING_PRESSABLE_HOVER,
	MARKETING_PRESSABLE_TAP,
} from "../../lib/marketing-motion";
import {
	buildPricingComparisonRows,
	COMPARISON_PLAN_IDS,
	COMPARISON_PLAN_LABELS,
	type ComparisonCellValue,
} from "../../lib/pricing-comparison";
import {
	formatUsdAmount,
	YEARLY_DISCOUNT_RATE,
	yearlyPerMonthPrice,
} from "../../lib/pricing-display";
import ComparisonAccordion from "./ComparisonAccordion";
import { MarketingPageBody, MarketingPageShell } from "./MarketingPageSequence";
import { MotionProvider } from "./MotionProvider";
import PricingCheckoutDialog from "./PricingCheckoutDialog";

const PRICING_HERO_TOP_COUNT = 3;

export type PricingPlan = {
	name: string;
	description: string;
	/** List price per month (monthly billing). Yearly view applies 15% off this rate. */
	price: { monthly: number | string };
	features: string[];
	cta: string;
	highlight: boolean;
	badge?: string;
	planId?: string;
};

export type EnterprisePricingBanner = {
	headline: string;
	body: string;
	cta: string;
	href: string;
};

type BillingInterval = "monthly" | "yearly";

interface PricingPlansIslandProps {
	plans: PricingPlan[];
	enterpriseBanner?: EnterprisePricingBanner;
}

const comparisonRows = buildPricingComparisonRows();

function BillingIntervalToggle({
	billingInterval,
	onChange,
	savePercentLabel,
}: {
	billingInterval: BillingInterval;
	onChange: (interval: BillingInterval) => void;
	savePercentLabel: string;
}) {
	return (
		<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4 col-span-full">
			<button
				type="button"
				onClick={() => onChange("monthly")}
				className={`text-sm font-medium font-manrope transition-colors duration-200 ${
					billingInterval === "monthly"
						? "text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
			>
				Monthly
			</button>
			<button
				type="button"
				onClick={() =>
					onChange(billingInterval === "monthly" ? "yearly" : "monthly")
				}
				className="relative h-6 w-11 shrink-0 rounded-full bg-primary"
				aria-label="Toggle billing interval"
			>
				<span
					className="absolute top-1 left-1 block size-4 rounded-full bg-background shadow-sm"
					style={{
						transform:
							billingInterval === "yearly" ? "translateX(20px)" : "none",
						transition: "transform 180ms ease",
					}}
				/>
			</button>
			<button
				type="button"
				onClick={() => onChange("yearly")}
				className={`text-sm font-medium font-manrope transition-colors duration-200 flex items-center gap-2 ${
					billingInterval === "yearly"
						? "text-foreground"
						: "text-muted-foreground hover:text-foreground"
				}`}
			>
				Yearly
				<span className="text-[10px] text-secondary-foreground bg-secondary px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
					Save {savePercentLabel}
				</span>
			</button>
		</div>
	);
}

function PlanPriceBlock({
	plan,
	billingInterval,
}: {
	plan: PricingPlan;
	billingInterval: BillingInterval;
}) {
	const isFree = plan.name.toLowerCase().includes("free");
	const monthlyList = plan.price.monthly;
	const hasNumericMonthly = typeof monthlyList === "number";

	const displayPrice =
		billingInterval === "yearly" && hasNumericMonthly
			? yearlyPerMonthPrice(monthlyList)
			: monthlyList;

	const isPerUser = plan.name.toLowerCase().includes("team");
	const unitLabel = isPerUser ? "/user/month" : "/month";

	const caption = isFree
		? "always free"
		: billingInterval === "yearly"
			? `7-day free trial, then ${unitLabel} billed yearly`
			: `7-day free trial, then ${unitLabel} billed monthly`;

	return (
		<div className="mb-8 flex h-28 flex-col justify-end">
			<div className="flex min-h-14 items-baseline gap-2 flex-wrap">
				{isFree ? (
					<span className="text-3xl md:text-4xl font-medium font-manrope">
						Free
					</span>
				) : typeof displayPrice === "number" ? (
					<div className="flex items-baseline gap-2 flex-wrap select-none overflow-hidden py-1">
						<AnimatePresence mode="popLayout" initial={false}>
							{billingInterval === "yearly" && (
								<motion.span
									key="strike"
									initial={{ opacity: 0, x: -15, scale: 0.9 }}
									animate={{ opacity: 0.6, x: 0, scale: 1 }}
									exit={{ opacity: 0, x: -15, scale: 0.9 }}
									transition={SPRING_TOKENS.snappy}
									className="text-lg md:text-xl font-medium font-manrope text-muted-foreground line-through whitespace-nowrap self-end pb-0.5"
								>
									${formatUsdAmount(monthlyList as number)}
								</motion.span>
							)}
						</AnimatePresence>

						<motion.div
							key={billingInterval}
							initial={{ opacity: 0, x: 15, scale: 0.95 }}
							animate={{ opacity: 1, x: 0, scale: 1 }}
							exit={{ opacity: 0, x: -15, scale: 0.95 }}
							transition={SPRING_TOKENS.snappy}
							className="flex items-baseline gap-1.5"
						>
							<span className="text-3xl md:text-4xl font-medium font-manrope tabular-nums tracking-tight">
								${formatUsdAmount(displayPrice)}
							</span>
							<span className="text-sm font-medium text-muted-foreground">
								USD
							</span>
						</motion.div>
					</div>
				) : (
					<span className="text-3xl font-medium font-manrope">
						{displayPrice}
					</span>
				)}
			</div>
			<div className="relative mt-2 h-10 text-sm text-muted-foreground">
				<p className="absolute inset-0 leading-snug">{caption}</p>
			</div>
		</div>
	);
}

function PricingPlanCard({
	plan,
	billingInterval,
	index,
	onCheckout,
}: {
	plan: PricingPlan;
	billingInterval: BillingInterval;
	index: number;
	onCheckout: (plan: PricingPlan) => void;
}) {
	const isFree = plan.name.toLowerCase().includes("free");

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.25 }}
			transition={{ duration: 0.5, delay: index * 0.1 }}
			className={
				plan.highlight
					? "relative flex flex-col p-8 rounded-3xl bg-background border-2 border-foreground text-foreground shadow-xl md:scale-[1.02] z-10"
					: "relative flex flex-col p-8 rounded-3xl bg-muted/80 border border-transparent hover:border-border/50"
			}
		>
			{plan.highlight && plan.badge ? (
				<div className="absolute -top-5 left-0 right-0 mx-auto w-fit bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full">
					{plan.badge}
				</div>
			) : null}

			<div className="mb-4 flex flex-col">
				<div className="inline-block w-fit px-3 py-1 rounded-full bg-background border border-border text-xs font-medium mb-4">
					{plan.name}
				</div>
				<p className="text-sm text-muted-foreground min-h-12 font-manrope leading-relaxed">
					{plan.description}
				</p>
			</div>

			<PlanPriceBlock plan={plan} billingInterval={billingInterval} />

			<div className="mb-8">
				<Pressable
					preset="snappy"
					whileHover={MARKETING_PRESSABLE_HOVER}
					whileTap={MARKETING_PRESSABLE_TAP}
				>
					{isFree ? (
						<a
							href={MARKETING_CTA.sandboxUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(marketingPrimaryMdClass, "w-full")}
						>
							{plan.cta}
						</a>
					) : (
						<button
							type="button"
							className={cn(marketingPrimaryMdClass, "w-full")}
							onClick={() => onCheckout(plan)}
						>
							{plan.cta}
						</button>
					)}
				</Pressable>
			</div>

			<div className="grow">
				<ul className="space-y-3">
					{plan.features.map((feature) => (
						<li
							key={feature}
							className="flex items-start gap-3 text-sm text-muted-foreground font-manrope"
						>
							<CheckIcon
								className="size-4 shrink-0 text-foreground mt-0.5"
								weight="bold"
								aria-hidden="true"
							/>
							<span>{feature}</span>
						</li>
					))}
				</ul>
			</div>
		</motion.div>
	);
}

function ComparisonCell({ value }: { value: ComparisonCellValue }) {
	if (value === true) {
		return (
			<CheckIcon className="size-5 text-foreground" weight="bold" aria-hidden />
		);
	}
	if (value === null) {
		return <span className="text-muted-foreground/30">–</span>;
	}
	return <span className="text-foreground font-medium">{value}</span>;
}

function ComparisonTable() {
	return (
		<section
			className="hidden lg:block col-span-full mt-8 py-4"
			aria-label="Plan feature comparison"
		>
			<p className="mb-2 text-xs text-muted-foreground lg:block xl:hidden">
				Scroll horizontally to view all columns
			</p>
			<div className="overflow-x-auto pb-2">
				<div className="min-w-215">
					<div className="grid grid-cols-4 gap-4 mb-6 px-4">
						<div className="sticky left-0 z-10 bg-background" />
						{COMPARISON_PLAN_IDS.map((planId) => (
							<div
								key={planId}
								className="flex items-center justify-center py-2"
							>
								<span className="font-medium text-xl md:text-2xl font-manrope text-center">
									{COMPARISON_PLAN_LABELS[planId]}
								</span>
							</div>
						))}
					</div>

					<div className="space-y-0">
						{comparisonRows.map((row, index) => {
							if (row.kind === "section") {
								return (
									<div
										key={row.id}
										className="sticky left-0 px-4 pt-8 pb-2 first:pt-0"
									>
										<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-manrope">
											{row.label}
										</p>
									</div>
								);
							}

							return (
								<motion.div
									key={row.id}
									initial={{ opacity: 0, y: 10 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.3, delay: index * 0.02 }}
									className="grid grid-cols-4 gap-4 py-4 px-4 border-t border-border/40 hover:bg-muted/30 transition-colors"
								>
									<div className="sticky left-0 z-10 flex items-center bg-background pr-4 text-sm font-medium font-manrope text-muted-foreground">
										{row.label}
									</div>
									{COMPARISON_PLAN_IDS.map((planId) => (
										<div
											key={`${row.id}-${planId}`}
											className="flex items-center justify-center text-sm font-manrope text-center"
										>
											<ComparisonCell value={row.values[planId]} />
										</div>
									))}
								</motion.div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}

function PricingPlansContent({
	plans,
	enterpriseBanner,
}: PricingPlansIslandProps) {
	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>("yearly");
	const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
	const savePercentLabel = `${Math.round(YEARLY_DISCOUNT_RATE * 100)}%`;

	return (
		<MarketingPageShell>
			<section id="pricing" className="bg-background py-12 md:py-20">
				<MarketingPageBody
					pace="page"
					heroTopChildCount={PRICING_HERO_TOP_COUNT}
					heroBottomChildCount={1}
					className={`${marketingSectionClass} grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12 *:first:col-span-full`}
				>
					<BillingIntervalToggle
						billingInterval={billingInterval}
						onChange={setBillingInterval}
						savePercentLabel={savePercentLabel}
					/>
					{plans.map((plan, index) => (
						<PricingPlanCard
							key={plan.name}
							plan={plan}
							billingInterval={billingInterval}
							index={index}
							onCheckout={setCheckoutPlan}
						/>
					))}
					<ComparisonTable />
					<div className="col-span-full">
						<ComparisonAccordion />
					</div>
					{enterpriseBanner ? (
						<div className="col-span-full flex flex-col gap-6 rounded-3xl border border-border/60 bg-muted/25 p-8 md:flex-row md:items-center md:justify-between md:gap-10">
							<div className="max-w-3xl space-y-2">
								<p className="text-lg font-medium font-manrope text-foreground">
									{enterpriseBanner.headline}
								</p>
								<p className="text-sm leading-relaxed text-muted-foreground font-manrope">
									{enterpriseBanner.body}
								</p>
							</div>
							<Pressable
								preset="snappy"
								whileHover={MARKETING_PRESSABLE_HOVER}
								whileTap={MARKETING_PRESSABLE_TAP}
							>
								<a
									href={enterpriseBanner.href}
									className={cn(marketingGhostLgClass, "shrink-0")}
								>
									{enterpriseBanner.cta}
								</a>
							</Pressable>
						</div>
					) : null}
					<p className="col-span-full text-center text-sm text-muted-foreground font-manrope">
						Plan limits and feature details are in the{" "}
						<a
							href="/docs/plans"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							Filosign docs
						</a>
						. Teams Pro items marked coming soon are on the{" "}
						<a
							href="/docs/plans/roadmap"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							roadmap
						</a>
						.
					</p>
				</MarketingPageBody>
			</section>
			{checkoutPlan?.planId ? (
				<PricingCheckoutDialog
					open
					onClose={() => setCheckoutPlan(null)}
					planName={checkoutPlan.name}
					planId={checkoutPlan.planId as "individual" | "teams" | "teams_pro"}
					billingInterval={billingInterval}
				/>
			) : null}
		</MarketingPageShell>
	);
}

export default function PricingPlansIsland(props: PricingPlansIslandProps) {
	return (
		<FilosignRpcProvider>
			<MotionProvider>
				<PricingPlansContent {...props} />
			</MotionProvider>
		</FilosignRpcProvider>
	);
}
