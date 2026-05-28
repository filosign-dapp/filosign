import { ArrowDownIcon } from "@phosphor-icons/react";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

type PricingHeroIslandProps = {
	appUrl: string;
};

export default function PricingHeroIsland({ appUrl }: PricingHeroIslandProps) {
	return (
		<MotionProvider>
			<section className="pt-32 px-4 md:px-8 lg:px-page bg-background relative overflow-hidden">
				<div className="max-w-7xl mx-auto relative z-10 space-y-16">
					<MarketingStagger
						pace="page"
						className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 lg:gap-12"
					>
						<div className="max-w-3xl">
							<h1 className="text-4xl md:text-5xl lg:text-5xl font-medium font-manrope tracking-tight text-foreground mb-6 leading-[1.1]">
								Sign agreements you can prove.
								<br />
								Pricing that stays simple.
							</h1>
							<p className="text-lg md:text-xl font-light font-manrope text-muted-foreground max-w-xl leading-relaxed">
								Wallet-native encryption, verifiable signatures, and optional
								USDC settlements, whether you send three documents a month or
								three thousand.
							</p>
						</div>

						<div className="flex flex-wrap gap-4 shrink-0">
							<a
								href={appUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center px-8 py-3 h-12 bg-primary text-primary-foreground rounded-lg font-medium transition-all duration-200 hover:bg-primary/90 hover:scale-105"
							>
								Start free
							</a>
							<a
								href="#pricing"
								className="inline-flex items-center justify-center gap-2 px-8 py-3 h-12 border border-border text-foreground rounded-lg font-medium transition-all duration-200 hover:bg-muted"
							>
								<ArrowDownIcon className="size-4" aria-hidden />
								Compare plans
							</a>
						</div>
					</MarketingStagger>
				</div>

				<div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-50">
					<div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[120px]" />
				</div>
			</section>
		</MotionProvider>
	);
}
