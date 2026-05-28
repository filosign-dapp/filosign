import { AnimatePresence, motion, SPRING_TOKENS } from "@filosign/motion";
import {
	ChatCenteredTextIcon,
	CheckIcon,
	CodeIcon,
	CoinsIcon,
	FileTextIcon,
	FoldersIcon,
	GitForkIcon,
	HardDrivesIcon,
	ShieldCheckIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import {
	formatUsdAmount,
	YEARLY_DISCOUNT_RATE,
	yearlyPerMonthPrice,
} from "../../lib/pricing-display";
import { MarketingPageBody, MarketingPageShell } from "./MarketingPageSequence";
import { MotionProvider } from "./MotionProvider";

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
	appUrl: string;
	plans: PricingPlan[];
	enterpriseBanner?: EnterprisePricingBanner;
}

type ComparisonFeature = {
	name: string;
	icon: ReactNode;
	values: (string | boolean | null)[];
};

const comparisonPlans = ["Free", "Solo", "Team", "Team Pro"] as const;

const comparisonFeatures: ComparisonFeature[] = [
	{
		name: "Documents per month",
		icon: <FileTextIcon className="size-5" weight="bold" />,
		values: ["3", "10", "30 per teammate", "Unlimited (fair use)"],
	},
	{
		name: "Recipients per document",
		icon: <UsersIcon className="size-5" weight="bold" />,
		values: ["1", "3", "10", "Unlimited"],
	},
	{
		name: "Long-term archival",
		icon: <HardDrivesIcon className="size-5" weight="bold" />,
		values: ["-", "1y / 5y / 10y", "1y / 5y / 10y", "1y / 5y / 10y"],
	},
	{
		name: "Shared templates",
		icon: <FoldersIcon className="size-5" weight="bold" />,
		values: [null, null, true, true],
	},
	{
		name: "Team drafts and comments",
		icon: <ChatCenteredTextIcon className="size-5" weight="bold" />,
		values: [null, null, true, true],
	},
	{
		name: "Advanced routing",
		icon: <GitForkIcon className="size-5" weight="bold" />,
		values: [null, null, true, true],
	},
	{
		name: "USDC settlements",
		icon: <CoinsIcon className="size-5" weight="bold" />,
		values: [null, null, true, true],
	},
	{
		name: "Custom integrations",
		icon: <CodeIcon className="size-5" weight="bold" />,
		values: [null, null, null, true],
	},
	{
		name: "Compliance exports",
		icon: <ShieldCheckIcon className="size-5" weight="bold" />,
		values: ["Basic", "CSV export", "Standard", "Advanced"],
	},
];

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
		<div className="flex items-center justify-center gap-4 mb-4 col-span-full">
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
			? `${unitLabel}, billed yearly`
			: `${unitLabel}, billed monthly`;

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
	appUrl,
	index,
}: {
	plan: PricingPlan;
	billingInterval: BillingInterval;
	appUrl: string;
	index: number;
}) {
	const isFree = plan.name.toLowerCase().includes("free");

	let checkoutUrl = appUrl;
	if (plan.planId && !isFree) {
		checkoutUrl = `${appUrl}/dashboard?upgrade=${plan.planId}&interval=${billingInterval}`;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.25 }}
			transition={{ duration: 0.5, delay: index * 0.1 }}
			className={
				plan.highlight
					? "relative flex flex-col p-8 rounded-3xl bg-background border-2 border-foreground text-foreground shadow-xl scale-[1.02] z-10"
					: "relative flex flex-col p-8 rounded-3xl bg-muted/30 border border-transparent hover:border-border/50"
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
				<a
					href={checkoutUrl}
					target="_blank"
					rel="noopener noreferrer"
					className={
						plan.highlight
							? "w-full h-10 flex items-center justify-center font-medium rounded-lg transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/90"
							: "w-full h-10 flex items-center justify-center font-medium rounded-lg transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
					}
				>
					{plan.cta}
				</a>
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

function ComparisonSection() {
	return (
		<section className="col-span-full mt-16 py-4">
			<motion.h2
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.5 }}
				className="text-3xl md:text-4xl font-semibold text-center font-manrope mb-12"
			>
				Compare plan features
			</motion.h2>

			<div className="overflow-x-auto pb-2">
				<div className="min-w-[860px]">
					<div className="grid grid-cols-5 gap-4 mb-8 px-4">
						<div />
						{comparisonPlans.map((plan) => (
							<div key={plan} className="flex items-center justify-center">
								<span className="font-medium text-xl md:text-2xl font-manrope text-center">
									{plan}
								</span>
							</div>
						))}
					</div>

					<div className="space-y-0">
						{comparisonFeatures.map((feature, index) => (
							<motion.div
								key={feature.name}
								initial={{ opacity: 0, y: 10 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.3, delay: index * 0.05 }}
								className="grid grid-cols-5 gap-4 py-5 px-4 border-t border-border/40 hover:bg-muted/30 transition-colors"
							>
								<div className="flex items-center gap-3 text-muted-foreground font-medium font-manrope">
									{feature.icon}
									{feature.name}
								</div>
								{feature.values.map((value, idx) => (
									<div
										key={`${feature.name}-${idx}`}
										className="flex items-center justify-center text-sm font-manrope text-center"
									>
										{value === true ? (
											<CheckIcon
												className="size-5 text-foreground"
												weight="bold"
											/>
										) : value === null ? (
											<span className="text-muted-foreground/30">-</span>
										) : (
											<span className="text-foreground font-medium">
												{value}
											</span>
										)}
									</div>
								))}
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function PricingPlansContent({
	appUrl,
	plans,
	enterpriseBanner,
}: PricingPlansIslandProps) {
	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>("yearly");
	const savePercentLabel = `${Math.round(YEARLY_DISCOUNT_RATE * 100)}%`;

	return (
		<MarketingPageShell>
			<section
				id="pricing"
				className="py-20 px-4 md:px-8 lg:px-page bg-background"
			>
				<MarketingPageBody
					pace="page"
					heroTopChildCount={PRICING_HERO_TOP_COUNT}
					heroBottomChildCount={1}
					className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 *:first:col-span-full"
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
							appUrl={appUrl}
							index={index}
						/>
					))}
					<ComparisonSection />
					{enterpriseBanner ? (
						<div className="col-span-full flex flex-col gap-6 rounded-3xl border border-border/60 bg-muted/25 p-8 md:flex-row md:items-center md:justify-between md:gap-10">
							<div className="max-w-2xl space-y-2">
								<p className="text-lg font-medium font-manrope text-foreground">
									{enterpriseBanner.headline}
								</p>
								<p className="text-sm leading-relaxed text-muted-foreground font-manrope">
									{enterpriseBanner.body}
								</p>
							</div>
							<a
								href={enterpriseBanner.href}
								className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-foreground bg-transparent px-6 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
							>
								{enterpriseBanner.cta}
							</a>
						</div>
					) : null}
				</MarketingPageBody>
			</section>
		</MarketingPageShell>
	);
}

export default function PricingPlansIsland(props: PricingPlansIslandProps) {
	return (
		<MotionProvider>
			<PricingPlansContent {...props} />
		</MotionProvider>
	);
}
