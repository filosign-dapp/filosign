import { Pressable } from "@filosign/motion";
import { ArrowDownIcon } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import {
	marketingGhostLgClass,
	marketingPrimaryLgClass,
} from "../../lib/marketing-button";
import { marketingSectionClass } from "../../lib/marketing-layout";
import {
	MARKETING_PRESSABLE_HOVER,
	MARKETING_PRESSABLE_TAP,
} from "../../lib/marketing-motion";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

type PricingHeroIslandProps = {
	appUrl: string;
};

export default function PricingHeroIsland({ appUrl }: PricingHeroIslandProps) {
	return (
		<MotionProvider>
			<section className="relative overflow-hidden bg-background pt-4 sm:pt-20">
				<div className={`${marketingSectionClass} relative z-10 space-y-16`}>
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
								attached payouts — from three documents a month to team-scale
								volume.
							</p>
						</div>

						<div className="flex flex-col w-full sm:w-auto gap-4 shrink-0">
							<Pressable
								preset="snappy"
								whileHover={MARKETING_PRESSABLE_HOVER}
								whileTap={MARKETING_PRESSABLE_TAP}
							>
								<a
									href={appUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={marketingPrimaryLgClass}
								>
									Start free
								</a>
							</Pressable>
							<Pressable
								preset="snappy"
								whileHover={MARKETING_PRESSABLE_HOVER}
								whileTap={MARKETING_PRESSABLE_TAP}
							>
								<a
									href="#pricing"
									className={cn(marketingGhostLgClass, "gap-2")}
								>
									<ArrowDownIcon className="size-4" aria-hidden />
									Compare plans
								</a>
							</Pressable>
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
