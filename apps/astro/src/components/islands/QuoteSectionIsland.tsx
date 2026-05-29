import { LightningIcon } from "@phosphor-icons/react";
import { MarketingInViewStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

export default function QuoteSectionIsland() {
	return (
		<MotionProvider>
			<section className="py-24 my-20 px-4 md:px-8 bg-card">
				<MarketingInViewStagger
					pace="page"
					className="max-w-4xl mx-auto text-center flex flex-col items-center justify-center space-y-12"
				>
					<div className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-card-foreground border border-border">
						<span className="flex h-5 w-5 items-center justify-center rounded-sm bg-secondary text-secondary-foreground">
							<LightningIcon weight="fill" className="h-3.5 w-3.5" />
						</span>
						<span className="text-primary-foreground">filosign</span>
					</div>

					<h2 className="text-3xl sm:text-4xl md:text-5xl font-medium leading-tight tracking-tight font-manrope text-foreground">
						<blockquote>
							"We started Filosign with one mission: To revolutionize the
							document workflow after the signature: private records, clear
							proof, and settlement when the agreement calls for it."
						</blockquote>
					</h2>

					<div className="flex flex-col items-center space-y-4">
						<div className="flex flex-col items-center">
							<img
								src="/kartik.jpeg"
								alt="Kartikay"
								width={100}
								height={100}
								className="rounded-full"
							/>
							<span className="text-sm mt-4 font-semibold text-foreground uppercase tracking-wide">
								Kartik
							</span>
							<span className="text-sm text-muted-foreground">
								Founder & CEO, Filosign
							</span>
						</div>
					</div>
				</MarketingInViewStagger>
			</section>
		</MotionProvider>
	);
}
