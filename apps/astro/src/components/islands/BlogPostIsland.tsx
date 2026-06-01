import { motion } from "motion/react";
import {
	blogPostShellClass,
	marketingSectionYClass,
} from "../../lib/marketing-layout";

export interface BlogPostHeroProps {
	title: string;
	readingTime: string;
	dateDisplay: string;
	heroImage: string;
	heroVideo?: string;
}

export default function BlogPostIsland({
	title,
	readingTime,
	dateDisplay,
	heroImage,
	heroVideo,
}: BlogPostHeroProps) {
	return (
		<div className={`${marketingSectionYClass} pb-6 md:pb-12`}>
			<div className={blogPostShellClass}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24 mb-6 md:mb-12 items-start"
				>
					<div className="lg:col-span-7 flex flex-col items-start">
						<div className="flex flex-wrap items-center gap-3 mb-4">
							<span className="text-sm font-medium text-muted-foreground">
								{dateDisplay}
							</span>
							<span className="bg-secondary text-foreground px-3 py-1 rounded-full text-xs font-normal tracking-wide">
								Reading time: {readingTime}
							</span>
						</div>

						<h1 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground leading-[1.05] font-manrope text-balance">
							{title}
						</h1>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					{heroVideo ? (
						<video
							autoPlay
							loop
							muted
							playsInline
							className="w-full h-auto rounded-xl object-cover aspect-video lg:aspect-2/1"
						>
							<source src={heroVideo} type="video/webm" />
						</video>
					) : (
						<img
							src={heroImage}
							alt={title}
							width={1280}
							height={720}
							className="w-full h-auto rounded-xl object-cover aspect-video lg:aspect-2/1"
						/>
					)}
				</motion.div>
			</div>
		</div>
	);
}
