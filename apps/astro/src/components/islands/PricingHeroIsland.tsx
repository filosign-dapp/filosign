import { ArrowDownIcon } from "@phosphor-icons/react";
import {
	MarketingHeroDecor,
	MarketingHeroTop,
	MarketingPageShell,
} from "./MarketingPageSequence";

const primaryButtonClass =
	"inline-flex items-center justify-center px-8 py-3 h-12 bg-primary text-primary-foreground rounded-lg font-medium transition-colors duration-200 hover:bg-primary/90";

const outlineButtonClass =
	"inline-flex items-center justify-center gap-2 px-8 py-3 h-12 border border-border text-foreground rounded-lg font-medium transition-colors duration-200 hover:bg-muted";

interface PricingHeroIslandProps {
	appUrl: string;
}

const HERO_TOP_COUNT = 3;

export default function PricingHeroIsland({ appUrl }: PricingHeroIslandProps) {
	return (
		<MarketingPageShell>
			<section className="pt-32 pb-12 px-4 md:px-8 lg:px-page bg-background relative overflow-hidden">
				<div className="max-w-7xl mx-auto relative z-10 space-y-16">
					<div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 lg:gap-12">
						<MarketingHeroTop
							pace="page"
							className="max-w-3xl flex flex-col gap-6"
						>
							<h1 className="text-4xl md:text-5xl lg:text-5xl font-medium font-manrope tracking-tight text-foreground leading-[1.1]">
								Secure signing for every scale.
								<br />
								Simple, transparent pricing.
							</h1>
							<p className="text-lg md:text-xl font-light font-manrope text-muted-foreground max-w-xl leading-relaxed">
								From individual creators to global enterprises,
								<br className="hidden md:block" />
								we have a plan that grows with you.
							</p>
							<div className="flex flex-wrap gap-4 shrink-0">
								<a
									href={appUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={primaryButtonClass}
								>
									Start for free
								</a>
								<a href="#pricing" className={outlineButtonClass}>
									<ArrowDownIcon className="size-4" aria-hidden="true" />
									Compare plans
								</a>
							</div>
						</MarketingHeroTop>
					</div>
				</div>

				<MarketingHeroDecor
					pace="page"
					topChildCount={HERO_TOP_COUNT}
					className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-50"
				>
					<div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[120px]" />
				</MarketingHeroDecor>
			</section>
		</MarketingPageShell>
	);
}

export { HERO_TOP_COUNT as PRICING_HERO_TOP_COUNT };
