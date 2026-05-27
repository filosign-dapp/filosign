import { CheckCircleIcon } from "@phosphor-icons/react";
import { MarketingPageBody, MarketingPageShell } from "./MarketingPageSequence";
import { PRICING_HERO_TOP_COUNT } from "./PricingHeroIsland";

export type PricingPlan = {
	name: string;
	description: string;
	price: { monthly: number; yearly: number };
	features: string[];
	cta: string;
	highlight: boolean;
	badge?: string;
};

interface PricingPlansIslandProps {
	appUrl: string;
	plans: PricingPlan[];
}

export default function PricingPlansIsland({
	appUrl,
	plans,
}: PricingPlansIslandProps) {
	const bodyChildren = [
		<div key="toggle" className="flex items-center justify-center gap-4 mb-16">
			<span className="text-sm font-medium font-manrope text-muted-foreground">
				Monthly
			</span>
			<div className="w-11 h-6 bg-primary rounded-full relative">
				<div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
			</div>
			<span className="text-sm font-medium font-manrope text-foreground flex items-center gap-2">
				Yearly
				<span className="text-xs text-secondary-foreground bg-secondary px-2 py-0.5 rounded-full">
					Save 15%
				</span>
			</span>
		</div>,
		...plans.map((plan) => (
			<div
				key={plan.name}
				className={
					plan.highlight
						? "relative flex flex-col p-8 rounded-3xl transition-all duration-300 bg-background border-2 border-foreground text-foreground shadow-xl scale-[1.02] z-10"
						: "relative flex flex-col p-8 rounded-3xl transition-all duration-300 bg-muted/30 border border-transparent hover:border-border/50"
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

				<div className="mb-8 min-h-[84px] flex flex-col justify-end">
					<div className="flex items-baseline gap-1">
						<span className="text-4xl font-medium font-manrope">
							${plan.price.yearly}
						</span>
						<span className="text-sm text-muted-foreground">USD</span>
					</div>
					<div className="text-sm text-muted-foreground mt-1">
						/month {plan.name !== "Free" && "for one user"}
					</div>
				</div>

				<div className="mb-8">
					<a
						href={appUrl}
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
								<CheckCircleIcon
									className="size-4 shrink-0 text-foreground mt-0.5"
									aria-hidden="true"
								/>
								<span>{feature}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		)),
	];

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
					className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 [&>:first-child]:col-span-full"
				>
					{bodyChildren}
				</MarketingPageBody>
			</section>
		</MarketingPageShell>
	);
}
