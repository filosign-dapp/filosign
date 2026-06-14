import { ArrowDownIcon } from "@phosphor-icons/react";
import type { ChangelogEntry } from "../../content/changelog";
import { cn } from "../../lib/cn";
import { marketingPrimaryLgClass } from "../../lib/marketing-button";
import {
	marketingSectionClass,
	marketingSectionYClass,
} from "../../lib/marketing-layout";
import ChangelogGrowthTreeIsland from "./ChangelogGrowthTreeIsland";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

interface ChangelogHeroIslandProps {
	entries: ChangelogEntry[];
}

function scrollToTimeline() {
	document
		.getElementById("changelog-timeline")
		?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToEntry(entryId: string) {
	document
		.getElementById(`changelog-entry-${entryId}`)
		?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function ChangelogHeroIsland({
	entries,
}: ChangelogHeroIslandProps) {
	return (
		<MotionProvider>
			<section
				className={cn(
					"relative overflow-hidden border-b border-border/50 bg-background",
					marketingSectionYClass,
				)}
			>
				<div className={`${marketingSectionClass} relative z-10`}>
					<div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
						<MarketingStagger
							pace="page"
							className="flex flex-col items-start text-left"
						>
							<p className="mb-3 font-manrope text-sm font-medium text-primary">
								What's new
							</p>
							<h1 className="mb-6 font-manrope text-4xl font-medium tracking-tight text-balance text-foreground md:text-5xl lg:text-6xl">
								Built fast, for teams that move fast
							</h1>
							<p className="mb-8 max-w-xl font-manrope text-lg leading-relaxed text-muted-foreground md:text-xl">
								Filosign ships often. This is what we have added for modern
								teams closing agreements, sharing proof, and finishing the
								handoff - not a list of internal refactors.
							</p>

							<button
								type="button"
								onClick={scrollToTimeline}
								className={cn(
									marketingPrimaryLgClass,
									"inline-flex cursor-pointer items-center justify-center gap-2",
								)}
							>
								<ArrowDownIcon className="size-4" aria-hidden />
								See what we shipped
							</button>
						</MarketingStagger>

						<MarketingStagger pace="page">
							<ChangelogGrowthTreeIsland
								entries={entries}
								onNodeClick={scrollToEntry}
							/>
						</MarketingStagger>
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 -z-10 opacity-50">
					<div className="absolute right-[-5%] top-[-10%] h-[30%] w-[30%] rounded-full bg-primary/5 blur-[120px]" />
				</div>
			</section>
		</MotionProvider>
	);
}
