import { motion } from "motion/react";
import { aboutMedia } from "../../config/about-media";
import { cn } from "../../lib/cn";
import { marketingSectionShellClass } from "../../lib/marketing-layout";
import { MarketingInViewStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

const badgeClass =
	"inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted px-3 py-1.5 text-sm font-medium text-secondary-foreground";

type StoryBeatProps = {
	title: string;
	paragraphs: readonly string[];
	imageSrc: string;
	imagePosition: "left" | "right";
};

function StoryImage({ src }: { src: string }) {
	return (
		<div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 md:aspect-3/2">
			<img
				src={src}
				alt=""
				width={960}
				height={640}
				loading="lazy"
				decoding="async"
				className="h-full w-full object-cover"
			/>
		</div>
	);
}

function StoryBeat({
	title,
	paragraphs,
	imageSrc,
	imagePosition,
}: StoryBeatProps) {
	const imageFirst = imagePosition === "left";

	return (
		<MarketingInViewStagger
			pace="page"
			className={cn(
				"grid items-center gap-8 md:gap-10 lg:grid-cols-2 lg:gap-12",
				!imageFirst && "lg:[&>*:first-child]:order-2",
			)}
		>
			<StoryImage src={imageSrc} />
			<div className="space-y-4">
				<h3 className="font-manrope text-2xl font-medium tracking-tight text-balance md:text-3xl">
					{title}
				</h3>
				{paragraphs.map((paragraph) => (
					<p
						key={paragraph}
						className="font-manrope text-base leading-relaxed text-muted-foreground text-pretty"
					>
						{paragraph}
					</p>
				))}
			</div>
		</MarketingInViewStagger>
	);
}

export default function AboutStorySectionIsland() {
	return (
		<MotionProvider>
			<section className={`${marketingSectionShellClass} bg-background`}>
				<MarketingInViewStagger
					pace="page"
					className="mb-12 flex flex-col items-center gap-4 text-center md:mb-16"
				>
					<h2 className="max-w-3xl font-manrope text-3xl font-medium tracking-tight text-balance md:text-4xl">
						Signing was never the hard part. Everything after the signature was.
					</h2>
					<p className="max-w-2xl font-manrope text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
						We built Filosign for teams tired of rebuilding the handoff from
						scattered files, chats, and payment follow-up.
					</p>
				</MarketingInViewStagger>

				<div className="space-y-16 md:space-y-20">
					<StoryBeat
						imagePosition="left"
						imageSrc={aboutMedia.storyGapImage}
						title="The finish line kept moving"
						paragraphs={[
							"We kept seeing the same pattern: a document gets signed, then the real work begins. Final deliverables sit in one folder, payment approval happens in another tool, and the record of who agreed to what ends up spread across inboxes and screenshots.",
							"Sensitive agreements deserved more than a signed PDF and a manual chase to the next step.",
						]}
					/>

					<StoryBeat
						imagePosition="right"
						imageSrc={aboutMedia.storyBuildImage}
						title="Built for what comes next"
						paragraphs={[
							"Filosign started from a simple belief: private agreements should leave proof you can keep, release files on your terms, and move approved payouts when signing conditions are met.",
							"We are building that as one workflow so you do not have to trust us with plaintext documents or pooled funds just to close the loop. The landing page shows how it works. This page is why we are building it.",
						]}
					/>
				</div>
			</section>
		</MotionProvider>
	);
}
