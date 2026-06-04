import { ArrowDownIcon } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";
import { marketingPrimaryLgClass } from "../../lib/marketing-button";
import {
	marketingSectionClass,
	marketingSectionYClass,
} from "../../lib/marketing-layout";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

export default function PricingHeroIsland() {
	return (
		<MotionProvider>
			<section
				className={cn(
					"relative overflow-hidden bg-background",
					marketingSectionYClass,
				)}
			>
				<div className={`${marketingSectionClass} relative z-10 space-y-16`}>
					<MarketingStagger
						pace="page"
						className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 lg:gap-12"
					>
						<div className="max-w-3xl">
							<h1 className="text-4xl md:text-5xl lg:text-5xl font-medium font-manrope tracking-tight text-foreground mb-6 leading-[1.1]">
								Price the workflow, not just the signature.
								<br />
								Plans that stay simple.
							</h1>
							<p className="text-lg md:text-xl font-light font-manrope text-muted-foreground max-w-xl leading-relaxed">
								Choose the plan for how many private agreement workflows you
								need, from solo proof exports to team workflows with gated files
								and payout packets.
							</p>
						</div>

						<div className="flex flex-col w-full sm:w-auto gap-4 shrink-0">
							<a
								href="#pricing"
								className={cn(
									marketingPrimaryLgClass,
									"gap-2 inline-flex items-center justify-center",
								)}
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
