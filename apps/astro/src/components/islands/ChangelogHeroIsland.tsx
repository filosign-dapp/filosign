import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

export default function ChangelogHeroIsland() {
	return (
		<MotionProvider>
			<section className="pt-32 pb-20 px-4 md:px-8 lg:px-page bg-background relative overflow-hidden min-h-[20dvh] sm:min-h-[60dvh] border-b border-border/50 flex items-center justify-center">
				<MarketingStagger
					pace="page"
					className="max-w-3xl mx-auto text-center relative z-10 flex flex-col items-center"
				>
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-manrope tracking-tight text-foreground mb-4">
						What's new?
					</h1>

					<p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
						Product updates across private signing, proof exports, settlement,
						and workflow improvements.
					</p>
				</MarketingStagger>

				<div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
					<div className="absolute bottom-[50%] -left-[15%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] border-secondary rounded-full" />

					<div className="absolute top-[30%] -right-[20%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] rounded-full border-secondary" />
				</div>
			</section>
		</MotionProvider>
	);
}
