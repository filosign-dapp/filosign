import { Pressable } from "@filosign/motion";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { aboutMedia } from "../../config/about-media";
import { cn } from "../../lib/cn";
import { marketingPrimaryMdClass } from "../../lib/marketing-button";
import {
	MARKETING_PRESSABLE_HOVER,
	MARKETING_PRESSABLE_TAP,
} from "../../lib/marketing-motion";
import { MotionProvider } from "./MotionProvider";

type AboutCtaBandProps = {
	appUrl: string;
};

export default function AboutCtaBand({ appUrl }: AboutCtaBandProps) {
	return (
		<MotionProvider>
			<section className="mx-auto max-w-7xl px-8 py-20 md:px-page">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="overflow-hidden rounded-3xl border border-border/60 bg-card p-8 md:p-12"
				>
					<div className="grid gap-8 lg:grid-cols-2 lg:items-center">
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.05 }}
							className="relative aspect-4/3 overflow-hidden rounded-2xl lg:aspect-auto lg:min-h-[280px]"
						>
							<img
								src={aboutMedia.ctaImage}
								alt=""
								width={960}
								height={720}
								loading="lazy"
								decoding="async"
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</motion.div>

						<div className="flex flex-col gap-6">
							<div className="space-y-3">
								<h2 className="text-2xl tracking-tight text-balance md:text-3xl">
									Ready to send your first agreement?
								</h2>
								<p className="font-manrope text-base leading-relaxed text-muted-foreground">
									Start free — encrypted signing, exportable records, and
									optional settlement when you need it.
								</p>
								<a
									href="/security"
									className="inline-block rounded-sm font-manrope text-sm font-medium text-foreground underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									Read our security overview
								</a>
							</div>

							<div className="self-start">
								<Pressable
									preset="snappy"
									whileHover={MARKETING_PRESSABLE_HOVER}
									whileTap={MARKETING_PRESSABLE_TAP}
								>
									<a
										href={appUrl}
										target="_blank"
										rel="noopener noreferrer"
										className={cn(
											marketingPrimaryMdClass,
											"flex items-center justify-center gap-2",
										)}
									>
										Start free
										<ArrowRightIcon
											className="size-4 transition-transform duration-200 group-hover/button:translate-x-1"
											aria-hidden
										/>
									</a>
								</Pressable>
							</div>
						</div>
					</div>
				</motion.div>
			</section>
		</MotionProvider>
	);
}
