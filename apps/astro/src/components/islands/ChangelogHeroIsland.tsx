import {
	marketingNarrowInnerClass,
	marketingSectionYClass,
} from "../../lib/marketing-layout";
import { cn } from "../../lib/cn";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

export default function ChangelogHeroIsland() {
	return (
		<MotionProvider>
			<section
				className={cn(
					"relative flex items-center justify-center overflow-hidden border-b border-border/50 bg-background px-4",
					marketingSectionYClass,
				)}
			>
				<MarketingStagger
					pace="page"
					className={cn(
						marketingNarrowInnerClass,
						"relative z-10 flex flex-col items-center text-center",
					)}
				>
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-manrope tracking-tight text-foreground mb-4 text-balance">
						What's new at Filosign
					</h1>

					<p className="text-lg text-muted-foreground max-w-xl mx-auto">
						How Filosign grew: sign-in and encrypted uploads first, then proof,
						teams, payouts, and drafts on top.
					</p>
				</MarketingStagger>
			</section>
		</MotionProvider>
	);
}
