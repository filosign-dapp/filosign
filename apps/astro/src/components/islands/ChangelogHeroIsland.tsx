import { ArrowSquareOutIcon, GithubLogoIcon } from "@phosphor-icons/react";
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
						A changelog of new features, design improvements and enhancements
						lately
					</p>

					<a
						href="https://github.com/hetairoi-labs/filosign/blob/main/CHANGELOG.md"
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-background hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground ring-1 ring-border/50 mb-6"
					>
						<GithubLogoIcon className="size-4" weight="fill" />
						<span className="text-sm font-medium font-manrope">
							Changelog on GitHub
						</span>
						<ArrowSquareOutIcon className="size-4" />
					</a>
				</MarketingStagger>

				<div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
					<div className="absolute bottom-[50%] -left-[15%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] border-secondary rounded-full" />

					<div className="absolute top-[30%] -right-[20%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] border-[60px] md:border-[100px] rounded-full border-secondary" />
				</div>
			</section>
		</MotionProvider>
	);
}
