import {
	marketingButtonFocus,
	marketingButtonMotion,
} from "../../lib/marketing-button";
import { marketingSectionClass } from "../../lib/marketing-layout";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

const primaryLgRounded = [
	"group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap select-none h-10 gap-1.5 px-8 bg-primary text-primary-foreground hover:bg-primary/80",
	marketingButtonFocus,
	marketingButtonMotion,
].join(" ");

interface BlogHeroIslandProps {
	title: string;
	description: string;
	dateDisplay: string;
	readHref: string;
}

export default function BlogHeroIsland({
	title,
	description,
	dateDisplay,
	readHref,
}: BlogHeroIslandProps) {
	return (
		<MotionProvider>
			<section className="bg-background py-12 md:py-20">
				<div className={marketingSectionClass}>
					<div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
						<MarketingStagger
							pace="page"
							className="flex flex-col items-start text-left"
						>
							<div className="text-sm font-medium text-muted-foreground mb-3">
								{dateDisplay}
							</div>
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-manrope tracking-tight text-foreground leading-[1.1] text-balance mb-6">
								{title}
							</h1>
							<p className="text-lg text-muted-foreground mb-8 md:mb-10 leading-relaxed">
								{description}
							</p>
							<div>
								<a href={readHref} className={primaryLgRounded}>
									Read article
								</a>
							</div>
						</MarketingStagger>

						<MarketingStagger pace="page">
							<div className="relative rounded-3xl overflow-hidden aspect-4/3 lg:aspect-5/4">
								<img
									src="/images/stock_12.webp"
									alt=""
									width={1280}
									height={720}
									className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:-translate-y-1"
								/>
							</div>
						</MarketingStagger>
					</div>
				</div>
			</section>
		</MotionProvider>
	);
}
