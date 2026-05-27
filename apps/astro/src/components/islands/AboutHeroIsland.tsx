import { SPRING_TOKENS } from "@filosign/motion";
import { motion } from "motion/react";
import { MarketingStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "./marketing-carousel";

const heroImages = [
	"/images/stock_1.webp",
	"/images/stock_2.webp",
	"/images/stock_3.webp",
	"/images/stock_4.webp",
	"/images/stock_5.webp",
	"/images/stock_6.webp",
	"/images/stock_7.webp",
	"/images/stock_8.webp",
];

export default function AboutHeroIsland() {
	return (
		<MotionProvider>
			<section className="relative pt-32 pb-24 overflow-hidden">
				<div className="container mx-auto px-4">
					<MarketingStagger
						pace="page"
						className="max-w-4xl mx-auto text-center mb-16 flex flex-col items-center"
					>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-manrope tracking-tight text-foreground mb-6">
							Filosign is on a mission to transform document signing.
						</h1>
						<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
							Empowering users with secure, decentralized, and efficient
							document signing solutions for the modern web.
						</p>
					</MarketingStagger>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						...SPRING_TOKENS.smooth,
						delay: 0.35,
					}}
					className="relative w-full"
				>
					<Carousel
						opts={{
							align: "center",
							loop: true,
							skipSnaps: false,
							duration: 20,
						}}
						className="w-full"
					>
						<CarouselContent className="-ml-4">
							{heroImages.map((src, index) => (
								<CarouselItem
									key={src}
									className="pl-4 basis-[85%] md:basis-[70%] lg:basis-[60%]"
								>
									<div className="relative w-full h-[50vh] md:h-[60vh] min-h-[400px] overflow-hidden rounded-3xl transform-gpu">
										<img
											src={src}
											alt={`Filosign office scene ${index + 1}`}
											className="object-cover w-full h-full will-change-transform"
											decoding="async"
											loading={index < 2 ? "eager" : "lazy"}
											style={{
												transform: "translate3d(0, 0, 0)",
												backfaceVisibility: "hidden",
											}}
										/>
									</div>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="left-4 md:left-12 bg-background/80 backdrop-blur-sm hover:bg-background z-10 h-12 w-12" />
						<CarouselNext className="right-4 md:right-12 bg-background/80 backdrop-blur-sm hover:bg-background z-10 h-12 w-12" />
					</Carousel>
				</motion.div>
			</section>
		</MotionProvider>
	);
}
