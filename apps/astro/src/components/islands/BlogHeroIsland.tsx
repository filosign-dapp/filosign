import {
	marketingButtonFocus,
	marketingButtonMotion,
} from "../../lib/marketing-button";
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
			<section className="pt-32 pb-20 px-4 md:px-8 lg:px-page bg-background">
				<div className="max-w-7xl mx-auto">
					<div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
						<MarketingStagger pace="page" className="space-y-6">
							<div className="text-sm font-medium text-muted-foreground">
								{dateDisplay}
							</div>
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-manrope tracking-tight text-foreground leading-[1.1]">
								{title}
							</h1>
							<p className="text-lg text-muted-foreground">{description}</p>
							<div className="pt-4">
								<a href={readHref} className={primaryLgRounded}>
									Read article
								</a>
							</div>
						</MarketingStagger>

						<MarketingStagger pace="page">
							<div className="relative rounded-3xl overflow-hidden aspect-[4/3] lg:aspect-[5/4]">
								<img
									src="/images/stock_4.webp"
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
