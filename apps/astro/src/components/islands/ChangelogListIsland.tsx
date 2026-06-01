import type { ChangelogEntry } from "../../content/changelog";
import {
	marketingNarrowInnerClass,
	marketingNarrowPageStackClass,
	marketingSectionYClass,
} from "../../lib/marketing-layout";
import { cn } from "../../lib/cn";
import { MarketingInViewStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

const badgeBase =
	"inline-flex shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-normal bg-muted/50 text-muted-foreground";

function typeDot(type: ChangelogEntry["type"]) {
	switch (type) {
		case "Feature":
			return "bg-blue-400";
		case "Enhancement":
			return "bg-purple-400";
		case "Fix":
			return "bg-orange-400";
		default:
			return "bg-gray-400";
	}
}

interface ChangelogListIslandProps {
	entries: ChangelogEntry[];
}

export default function ChangelogListIsland({
	entries,
}: ChangelogListIslandProps) {
	return (
		<MotionProvider>
			<section
				className={cn("bg-background px-4", marketingSectionYClass)}
			>
				<MarketingInViewStagger
					pace="page"
					maxVisible={24}
					className={cn(
						marketingNarrowInnerClass,
						marketingNarrowPageStackClass,
					)}
				>
					{entries.map((entry) => (
						<div
							key={entry.id}
							className="grid md:grid-cols-[12rem_1fr] gap-6 md:gap-8"
						>
							<div className="text-muted-foreground font-medium text-sm md:text-right pt-0.5 font-manrope">
								{entry.date}
							</div>

							<div className="space-y-2 min-w-0">
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
									<h2 className="text-xl md:text-2xl font-medium font-manrope tracking-tight text-foreground">
										{entry.title}
									</h2>
									<div className={badgeBase}>
										<span
											className={`inline-block h-1.5 w-1.5 rounded-full ${typeDot(entry.type)}`}
										/>
										{entry.type}
									</div>
								</div>

								<p className="text-muted-foreground leading-relaxed text-base md:text-lg">
									{entry.description.join(" ")}
								</p>

								{entry.image ? (
									<div className="relative rounded-3xl overflow-hidden w-full aspect-video bg-secondary mt-4">
										<img
											src={entry.image}
											alt={entry.title}
											className="relative inset-0 w-full h-full object-cover p-4 rounded-4xl"
										/>
									</div>
								) : null}
							</div>
						</div>
					))}
				</MarketingInViewStagger>
			</section>
		</MotionProvider>
	);
}
